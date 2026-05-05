package fcm

import (
	"context"
	"encoding/json"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// Client wraps Firebase Messaging for sending push notifications.
type Client struct {
	messaging *messaging.Client
}

// New initialises the Firebase Admin SDK.
// serviceAccountJSON: raw JSON of the service account key (from env FIREBASE_SERVICE_ACCOUNT_JSON).
// If empty, falls back to Application Default Credentials (ADC).
func New(serviceAccountJSON string) (*Client, error) {
	ctx := context.Background()

	var opts []option.ClientOption
	if serviceAccountJSON != "" {
		opts = append(opts, option.WithCredentialsJSON([]byte(serviceAccountJSON)))
	}

	app, err := firebase.NewApp(ctx, nil, opts...)
	if err != nil {
		return nil, err
	}

	msgClient, err := app.Messaging(ctx)
	if err != nil {
		return nil, err
	}

	return &Client{messaging: msgClient}, nil
}

// SendToToken sends a data+notification push to a single FCM registration token.
// Returns (false, nil) if the token is invalid/unregistered so callers can clean it up.
func (c *Client) SendToToken(ctx context.Context, token, title, body string, data map[string]string) (bool, error) {
	msg := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}
	_, err := c.messaging.Send(ctx, msg)
	if err != nil {
		if messaging.IsRegistrationTokenNotRegistered(err) {
			return false, nil // token is invalid — caller should delete it
		}
		return true, err
	}
	return true, nil
}

// SendToTokens sends a notification to up to 500 tokens (FCM multicast limit).
// Returns the list of invalid tokens that should be deleted.
func (c *Client) SendToTokens(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error) {
	if len(tokens) == 0 {
		return nil, nil
	}

	msg := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	resp, err := c.messaging.SendEachForMulticast(ctx, msg)
	if err != nil {
		return nil, err
	}

	var invalid []string
	for i, r := range resp.Responses {
		if !r.Success && messaging.IsRegistrationTokenNotRegistered(r.Error) {
			invalid = append(invalid, tokens[i])
		}
	}
	return invalid, nil
}

// DataPayload serialises an arbitrary value to a map[string]string for FCM data field.
func DataPayload(v any) map[string]string {
	b, _ := json.Marshal(v)
	return map[string]string{"payload": string(b)}
}
