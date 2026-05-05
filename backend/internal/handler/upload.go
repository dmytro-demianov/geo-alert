package handler

import (
	"bytes"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/dmytro-demianov/geo-alert/pkg/storage"
)

const maxPhotoSize = 10 << 20 // 10 MB

// UploadHandler handles photo upload to Firebase Storage.
type UploadHandler struct {
	storage *storage.Client
}

// NewUploadHandler creates a new UploadHandler.
// storageClient may be nil — in that case all upload attempts return 503.
func NewUploadHandler(storageClient *storage.Client) *UploadHandler {
	return &UploadHandler{storage: storageClient}
}

// POST /upload/photo
// Accepts multipart/form-data with field "photo" (JPEG, PNG, or WebP, max 10 MB).
// Returns {"url": "https://storage.googleapis.com/..."} on success.
func (h *UploadHandler) UploadPhoto(c *gin.Context) {
	if h.storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "storage not configured"})
		return
	}

	// Enforce max body size early.
	if c.Request.ContentLength > maxPhotoSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file too large (max 10 MB)"})
		return
	}

	file, header, err := c.Request.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "field 'photo' is required"})
		return
	}
	defer file.Close()

	if header.Size > maxPhotoSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "file too large (max 10 MB)"})
		return
	}

	// Read file bytes (up to limit + 1 to detect oversize).
	buf := make([]byte, header.Size)
	if _, err := file.Read(buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file"})
		return
	}

	// Validate MIME type via magic bytes.
	contentType, ok := detectImageContentType(buf)
	if !ok {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": "only image/jpeg, image/png, image/webp are accepted"})
		return
	}

	url, err := h.storage.UploadPhoto(c.Request.Context(), buf, contentType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload photo"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// detectImageContentType checks magic bytes and returns the MIME type.
// Returns ("", false) if the content is not a supported image type.
func detectImageContentType(data []byte) (string, bool) {
	if len(data) < 4 {
		return "", false
	}

	// JPEG: FF D8 FF
	if bytes.HasPrefix(data, []byte{0xFF, 0xD8, 0xFF}) {
		return "image/jpeg", true
	}

	// PNG: 89 50 4E 47 (== \x89PNG)
	if bytes.HasPrefix(data, []byte{0x89, 0x50, 0x4E, 0x47}) {
		return "image/png", true
	}

	// WebP: RIFF????WEBP  (bytes 0-3 == "RIFF", bytes 8-11 == "WEBP")
	if len(data) >= 12 &&
		bytes.Equal(data[0:4], []byte("RIFF")) &&
		bytes.Equal(data[8:12], []byte("WEBP")) {
		return "image/webp", true
	}

	return "", false
}
