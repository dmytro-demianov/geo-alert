package storage

import (
	"context"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	gcs "cloud.google.com/go/storage"
	"github.com/google/uuid"
	"google.golang.org/api/option"
)

// Client wraps Firebase/GCS Storage for uploading and deleting photos.
type Client struct {
	bucket     *gcs.BucketHandle
	bucketName string
}

// New initialises the Firebase Storage client using the given service account JSON and bucket name.
// Returns an error if bucketName is empty.
func New(serviceAccountJSON string, bucketName string) (*Client, error) {
	if bucketName == "" {
		return nil, fmt.Errorf("storage bucket name is required")
	}

	ctx := context.Background()

	var opts []option.ClientOption
	if serviceAccountJSON != "" {
		opts = append(opts, option.WithCredentialsJSON([]byte(serviceAccountJSON)))
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{StorageBucket: bucketName}, opts...)
	if err != nil {
		return nil, fmt.Errorf("firebase.NewApp: %w", err)
	}

	storageClient, err := app.Storage(ctx)
	if err != nil {
		return nil, fmt.Errorf("app.Storage: %w", err)
	}

	bucket, err := storageClient.DefaultBucket()
	if err != nil {
		return nil, fmt.Errorf("storageClient.DefaultBucket: %w", err)
	}

	return &Client{bucket: bucket, bucketName: bucketName}, nil
}

// extFromContentType returns a file extension for the given MIME type.
func extFromContentType(ct string) string {
	switch ct {
	case "image/jpeg":
		return "jpg"
	case "image/png":
		return "png"
	case "image/webp":
		return "webp"
	default:
		return "bin"
	}
}

// UploadPhoto uploads image bytes to Firebase Storage and returns a public URL.
func (c *Client) UploadPhoto(ctx context.Context, data []byte, contentType string) (string, error) {
	ext := extFromContentType(contentType)
	filename := fmt.Sprintf("photos/%s.%s", uuid.New().String(), ext)

	obj := c.bucket.Object(filename)
	w := obj.NewWriter(ctx)
	w.ContentType = contentType

	if _, err := w.Write(data); err != nil {
		_ = w.Close()
		return "", fmt.Errorf("write to storage: %w", err)
	}
	if err := w.Close(); err != nil {
		return "", fmt.Errorf("close storage writer: %w", err)
	}

	// Make the object publicly readable.
	if err := obj.ACL().Set(ctx, gcs.AllUsers, gcs.RoleReader); err != nil {
		return "", fmt.Errorf("set ACL: %w", err)
	}

	url := fmt.Sprintf("https://storage.googleapis.com/%s/%s", c.bucketName, filename)
	return url, nil
}

// DeletePhoto deletes a single photo by its public URL.
func (c *Client) DeletePhoto(ctx context.Context, photoURL string) error {
	filename := filenameFromURL(photoURL, c.bucketName)
	if filename == "" {
		return fmt.Errorf("cannot parse filename from URL: %s", photoURL)
	}
	if err := c.bucket.Object(filename).Delete(ctx); err != nil {
		return fmt.Errorf("delete object %s: %w", filename, err)
	}
	return nil
}

// DeletePhotos deletes multiple photos by their public URLs.
// All deletions are attempted; the first error encountered is returned.
func (c *Client) DeletePhotos(ctx context.Context, photoURLs []string) error {
	var firstErr error
	for _, u := range photoURLs {
		if err := c.DeletePhoto(ctx, u); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

// filenameFromURL extracts the GCS object path from a public URL.
// Expected format: https://storage.googleapis.com/<bucket>/<object-path>
func filenameFromURL(photoURL, bucketName string) string {
	prefix := fmt.Sprintf("https://storage.googleapis.com/%s/", bucketName)
	if strings.HasPrefix(photoURL, prefix) {
		return strings.TrimPrefix(photoURL, prefix)
	}
	return ""
}
