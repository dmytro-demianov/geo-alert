package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// NotificationCooldown represents a per-user, per-marker cooldown record.
type NotificationCooldown struct {
	UserID         uuid.UUID  `gorm:"type:uuid;primaryKey;column:user_id"`
	MarkerID       uuid.UUID  `gorm:"type:uuid;primaryKey;column:marker_id"`
	LastNotifiedAt time.Time  `gorm:"column:last_notified_at"`
	LastLeftAt     *time.Time `gorm:"column:last_left_at"`
}

func (NotificationCooldown) TableName() string { return "notification_cooldowns" }

// CooldownRepo manages notification cooldown records.
type CooldownRepo struct {
	db *gorm.DB
}

func NewCooldownRepo(db *gorm.DB) *CooldownRepo {
	return &CooldownRepo{db: db}
}

// Get retrieves the cooldown record for a (user, marker) pair.
// Returns nil, nil when no record exists yet.
func (r *CooldownRepo) Get(userID, markerID uuid.UUID) (*NotificationCooldown, error) {
	var cd NotificationCooldown
	err := r.db.Where("user_id = ? AND marker_id = ?", userID, markerID).First(&cd).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &cd, nil
}

// Upsert inserts or updates last_notified_at = NOW() for the given pair.
func (r *CooldownRepo) Upsert(userID, markerID uuid.UUID) error {
	cd := NotificationCooldown{
		UserID:         userID,
		MarkerID:       markerID,
		LastNotifiedAt: time.Now().UTC(),
	}
	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "user_id"}, {Name: "marker_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"last_notified_at"}),
	}).Create(&cd).Error
}

// MarkLeft records the time the user left the marker's radius.
func (r *CooldownRepo) MarkLeft(userID, markerID uuid.UUID) error {
	now := time.Now().UTC()
	return r.db.Model(&NotificationCooldown{}).
		Where("user_id = ? AND marker_id = ?", userID, markerID).
		Update("last_left_at", now).Error
}
