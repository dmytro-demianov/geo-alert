package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type FeedRepo struct {
	db *gorm.DB
}

func NewFeedRepo(db *gorm.DB) *FeedRepo {
	return &FeedRepo{db: db}
}

type FeedCursor struct {
	Before time.Time
	ID     uuid.UUID
}

// FeedItems returns markers from cards the user is subscribed to (directly or via user subscription).
// Deduplication is natural: markers belong to exactly one card, so card+user overlap causes no double-counting.
// Filters: non-deleted, non-expired, non-draft, non-blocked authors.
func (r *FeedRepo) FeedItems(userID uuid.UUID, cursor *FeedCursor, limit int) ([]domain.Marker, error) {
	cursorClause := "TRUE"
	args := []interface{}{userID, userID, userID}

	if cursor != nil {
		cursorClause = "(m.created_at, m.id::text) < (?, ?)"
		args = append(args, cursor.Before, cursor.ID.String())
	}

	query := `
		SELECT m.*
		FROM markers m
		JOIN cards c ON m.card_id = c.id
		WHERE (
			c.id IN (
				SELECT target_card_id FROM subscriptions
				WHERE user_id = ? AND target_card_id IS NOT NULL
			)
			OR c.owner_id IN (
				SELECT target_user_id FROM subscriptions
				WHERE user_id = ? AND target_user_id IS NOT NULL
			)
		)
		AND m.deleted_at IS NULL
		AND c.deleted_at IS NULL
		AND (m.expires_at IS NULL OR m.expires_at > NOW())
		AND m.is_draft = false
		AND m.created_by NOT IN (
			SELECT blocked_user_id FROM blocked_users
			WHERE blocker_id = ? AND block_type = 'USER_BLOCK'
		)
		AND ` + cursorClause + `
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT ?
	`
	args = append(args, limit)

	var markers []domain.Marker
	err := r.db.Raw(query, args...).Scan(&markers).Error
	return markers, err
}
