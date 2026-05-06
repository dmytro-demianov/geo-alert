package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type SubscriptionRepo struct {
	db *gorm.DB
}

func NewSubscriptionRepo(db *gorm.DB) *SubscriptionRepo {
	return &SubscriptionRepo{db: db}
}

func (r *SubscriptionRepo) Create(sub *domain.Subscription) error {
	return r.db.Create(sub).Error
}

func (r *SubscriptionRepo) FindByID(id uuid.UUID) (*domain.Subscription, error) {
	var sub domain.Subscription
	err := r.db.First(&sub, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sub, err
}

func (r *SubscriptionRepo) FindByUserAndCard(userID, cardID uuid.UUID) (*domain.Subscription, error) {
	var sub domain.Subscription
	err := r.db.Where("user_id = ? AND target_card_id = ?", userID, cardID).First(&sub).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sub, err
}

func (r *SubscriptionRepo) FindByUserAndTargetUser(userID, targetUserID uuid.UUID) (*domain.Subscription, error) {
	var sub domain.Subscription
	err := r.db.Where("user_id = ? AND target_user_id = ?", userID, targetUserID).First(&sub).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &sub, err
}

func (r *SubscriptionRepo) FindByCardID(cardID uuid.UUID) ([]domain.Subscription, error) {
	var subs []domain.Subscription
	err := r.db.Where("target_card_id = ?", cardID).Find(&subs).Error
	return subs, err
}

func (r *SubscriptionRepo) FindByUser(userID uuid.UUID) ([]domain.Subscription, error) {
	var subs []domain.Subscription
	err := r.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&subs).Error
	return subs, err
}

func (r *SubscriptionRepo) Delete(id uuid.UUID, userID uuid.UUID) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&domain.Subscription{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *SubscriptionRepo) IncrementSubscriberCount(cardID uuid.UUID) error {
	return r.db.Exec("UPDATE cards SET subscriber_count = subscriber_count + 1 WHERE id = ?", cardID).Error
}

func (r *SubscriptionRepo) DecrementSubscriberCount(cardID uuid.UUID) error {
	return r.db.Exec("UPDATE cards SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = ?", cardID).Error
}
