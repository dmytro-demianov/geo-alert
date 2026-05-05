package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NearbyMarker holds the result of a nearby-marker query.
type NearbyMarker struct {
	ID              uuid.UUID `gorm:"column:id"`
	Title           string    `gorm:"column:title"`
	Latitude        float64   `gorm:"column:latitude"`
	Longitude       float64   `gorm:"column:longitude"`
	Radius          int       `gorm:"column:radius"`
	LikeWeight      int       `gorm:"column:like_weight"`
	CardID          uuid.UUID `gorm:"column:card_id"`
	DistanceMeters  float64   `gorm:"column:distance_meters"`
}

type LocationRepo struct {
	db *gorm.DB
}

func NewLocationRepo(db *gorm.DB) *LocationRepo {
	return &LocationRepo{db: db}
}

// FindNearbyForUser returns active markers within each card's radius of (lat,lon),
// visible to the given user: public cards + cards where user is owner or subscriber.
// Blocked authors are excluded.
func (r *LocationRepo) FindNearbyForUser(userID uuid.UUID, lat, lon float64) ([]NearbyMarker, error) {
	query := `
		SELECT
			m.id,
			m.title,
			m.latitude,
			m.longitude,
			c.radius,
			m.like_weight,
			m.card_id,
			ST_Distance(
				m.location::geography,
				ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
			) AS distance_meters
		FROM markers m
		JOIN cards c ON m.card_id = c.id
		WHERE
			m.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND (m.expires_at IS NULL OR m.expires_at > NOW())
			AND (m.is_draft = false OR m.created_by = $3)
			AND ST_DWithin(
				m.location::geography,
				ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
				c.radius
			)
			AND (
				c.is_public = true
				OR c.owner_id = $3
				OR c.id IN (
					SELECT target_card_id FROM subscriptions
					WHERE user_id = $3 AND target_card_id IS NOT NULL
				)
			)
			AND m.created_by NOT IN (
				SELECT blocked_user_id FROM blocked_users
				WHERE blocker_id = $3 AND block_type = 'USER_BLOCK'
			)
		ORDER BY distance_meters ASC
	`
	var results []NearbyMarker
	err := r.db.Raw(query, lat, lon, userID).Scan(&results).Error
	return results, err
}

// FindNearbyPublic returns active markers from public cards within the given radiusMeters of (lat,lon).
// Supports cursor-based pagination via beforeID.
// If callerID is non-nil, blocked authors are excluded for that caller.
func (r *LocationRepo) FindNearbyPublic(lat, lon, radiusMeters float64, limit int, beforeID *uuid.UUID, callerID *uuid.UUID) ([]NearbyMarker, error) {
	cursorClause := "TRUE"
	args := []interface{}{lat, lon, radiusMeters}
	argIdx := 4

	if beforeID != nil {
		cursorClause = "m.id < $" + itoa(argIdx)
		args = append(args, *beforeID)
		argIdx++
	}

	blockClause := "TRUE"
	if callerID != nil {
		blockClause = "m.created_by NOT IN (SELECT blocked_user_id FROM blocked_users WHERE blocker_id = $" + itoa(argIdx) + " AND block_type = 'USER_BLOCK')"
		args = append(args, *callerID)
		argIdx++
	}

	args = append(args, limit)
	limitPlaceholder := "$" + itoa(argIdx)

	query := `
		SELECT
			m.id,
			m.title,
			m.latitude,
			m.longitude,
			c.radius,
			m.like_weight,
			m.card_id,
			ST_Distance(
				m.location::geography,
				ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
			) AS distance_meters
		FROM markers m
		JOIN cards c ON m.card_id = c.id
		WHERE
			m.deleted_at IS NULL
			AND c.deleted_at IS NULL
			AND c.is_public = true
			AND m.is_draft = false
			AND (m.expires_at IS NULL OR m.expires_at > NOW())
			AND ST_DWithin(
				m.location::geography,
				ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
				$3
			)
			AND ` + cursorClause + `
			AND ` + blockClause + `
		ORDER BY distance_meters ASC, m.id DESC
		LIMIT ` + limitPlaceholder

	var results []NearbyMarker
	err := r.db.Raw(query, args...).Scan(&results).Error
	return results, err
}

// itoa converts int to string without importing strconv at package level.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	buf := [20]byte{}
	pos := len(buf)
	for n > 0 {
		pos--
		buf[pos] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[pos:])
}
