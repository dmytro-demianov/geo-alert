package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/pkg/fcm"
)

const (
	// notifCooldownDuration is the minimum time between two notifications for
	// the same (user, marker) pair when we cannot confirm the user left the radius.
	notifCooldownDuration = time.Hour
)

// NotificationService sends FCM push notifications for nearby markers.
type NotificationService struct {
	fcm      *fcm.Client
	cooldown *repository.CooldownRepo
	users    *repository.UserRepo
}

// NewNotificationService creates a NotificationService.
// fcmClient may be nil — in that case all send operations are silently no-ops.
func NewNotificationService(
	fcmClient *fcm.Client,
	cooldownRepo *repository.CooldownRepo,
	userRepo *repository.UserRepo,
) *NotificationService {
	return &NotificationService{
		fcm:      fcmClient,
		cooldown: cooldownRepo,
		users:    userRepo,
	}
}

// SendNearbyPush evaluates cooldown rules for each nearby marker, builds a
// batched push notification and sends it via FCM. Invalid tokens are cleaned up.
//
// If fcmClient was not initialised (nil), the call is a no-op.
func (s *NotificationService) SendNearbyPush(
	ctx context.Context,
	userID uuid.UUID,
	fcmToken string,
	nearbyMarkers []repository.NearbyMarker,
) {
	if s.fcm == nil || fcmToken == "" || len(nearbyMarkers) == 0 {
		return
	}

	// Determine which markers should trigger a push (cooldown check).
	var toNotify []repository.NearbyMarker
	for _, m := range nearbyMarkers {
		shouldSend, err := s.shouldSendNotification(userID, m.ID)
		if err != nil {
			log.Warn().Err(err).
				Str("user_id", userID.String()).
				Str("marker_id", m.ID.String()).
				Msg("notification: cooldown check failed, skipping marker")
			continue
		}
		if shouldSend {
			toNotify = append(toNotify, m)
		}
	}

	if len(toNotify) == 0 {
		return
	}

	// Build notification text.
	title, body := buildNotificationText(toNotify)

	// Build data payload with marker IDs so the client can deep-link.
	ids := make([]string, len(toNotify))
	for i, m := range toNotify {
		ids[i] = m.ID.String()
	}
	data := map[string]string{
		"type":       "nearby_markers",
		"marker_ids": strings.Join(ids, ","),
	}

	tokenValid, err := s.fcm.SendToToken(ctx, fcmToken, title, body, data)
	if err != nil {
		log.Warn().Err(err).
			Str("user_id", userID.String()).
			Msg("notification: FCM send error")
		return
	}

	if !tokenValid {
		// Token is invalid / unregistered — clean it up so we don't retry.
		log.Info().Str("user_id", userID.String()).Msg("notification: clearing invalid FCM token")
		if clearErr := s.users.ClearFCMToken(userID); clearErr != nil {
			log.Warn().Err(clearErr).Str("user_id", userID.String()).Msg("notification: failed to clear FCM token")
		}
		return
	}

	// Persist cooldown for each notified marker.
	for _, m := range toNotify {
		if upsertErr := s.cooldown.Upsert(userID, m.ID); upsertErr != nil {
			log.Warn().Err(upsertErr).
				Str("user_id", userID.String()).
				Str("marker_id", m.ID.String()).
				Msg("notification: failed to upsert cooldown")
		}
	}
}

// shouldSendNotification returns true when a push should be sent for this
// (user, marker) pair based on the cooldown rules:
//   - No record → send (first time).
//   - Record exists and last_left_at is after last_notified_at → user
//     re-entered the radius → send again.
//   - Otherwise: suppress if last_notified_at < 1 h ago; allow after 1 h.
func (s *NotificationService) shouldSendNotification(userID, markerID uuid.UUID) (bool, error) {
	cd, err := s.cooldown.Get(userID, markerID)
	if err != nil {
		return false, fmt.Errorf("get cooldown: %w", err)
	}

	// First notification ever.
	if cd == nil {
		return true, nil
	}

	// User explicitly left the radius since the last notification.
	if cd.LastLeftAt != nil && cd.LastLeftAt.After(cd.LastNotifiedAt) {
		return true, nil
	}

	// Fallback time-based cooldown: allow re-notification after 1 hour.
	if time.Since(cd.LastNotifiedAt) >= notifCooldownDuration {
		return true, nil
	}

	return false, nil
}

// buildNotificationText returns (title, body) for a batch of nearby markers.
func buildNotificationText(markers []repository.NearbyMarker) (string, string) {
	if len(markers) == 1 {
		return "Geo Alert", fmt.Sprintf("Вы рядом с меткой: %s", markers[0].Title)
	}

	titles := make([]string, len(markers))
	for i, m := range markers {
		titles[i] = m.Title
	}
	return "Geo Alert", fmt.Sprintf("Вы рядом с: %s", strings.Join(titles, ", "))
}
