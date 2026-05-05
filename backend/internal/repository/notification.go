package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type NotificationRepo struct {
	db *gorm.DB
}

func NewNotificationRepo(db *gorm.DB) *NotificationRepo {
	return &NotificationRepo{db: db}
}

func (r *NotificationRepo) Create(n *domain.Notification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepo) FindByUserID(userID uuid.UUID, limit int, before *time.Time) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	q := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit)

	if before != nil {
		q = q.Where("created_at < ?", before)
	}

	var notifications []domain.Notification
	err := q.Find(&notifications).Error
	return notifications, err
}

func (r *NotificationRepo) CountUnread(userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Count(&count).Error
	return count, err
}

func (r *NotificationRepo) MarkRead(id uuid.UUID, userID uuid.UUID) error {
	return r.db.Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

func (r *NotificationRepo) MarkAllRead(userID uuid.UUID) error {
	return r.db.Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true).Error
}
