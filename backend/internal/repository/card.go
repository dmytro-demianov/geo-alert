package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type CardRepo struct {
	db *gorm.DB
}

func NewCardRepo(db *gorm.DB) *CardRepo {
	return &CardRepo{db: db}
}

func (r *CardRepo) Create(card *domain.Card) error {
	return r.db.Create(card).Error
}

func (r *CardRepo) FindByID(id uuid.UUID) (*domain.Card, error) {
	var card domain.Card
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&card).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &card, err
}

func (r *CardRepo) FindByOwnerID(ownerID uuid.UUID, limit, offset int) ([]domain.Card, error) {
	var cards []domain.Card
	err := r.db.Where("owner_id = ? AND deleted_at IS NULL", ownerID).
		Limit(limit).Offset(offset).
		Order("created_at DESC").
		Find(&cards).Error
	return cards, err
}

func (r *CardRepo) FindPublic(limit, offset int) ([]domain.Card, error) {
	var cards []domain.Card
	err := r.db.Where("is_public = true AND deleted_at IS NULL").
		Limit(limit).Offset(offset).
		Order("created_at DESC").
		Find(&cards).Error
	return cards, err
}

func (r *CardRepo) Update(card *domain.Card) error {
	return r.db.Save(card).Error
}

func (r *CardRepo) Delete(id uuid.UUID, ownerID uuid.UUID) error {
	result := r.db.Where("id = ? AND owner_id = ? AND deleted_at IS NULL", id, ownerID).
		First(&domain.Card{})
	if result.Error == gorm.ErrRecordNotFound {
		return gorm.ErrRecordNotFound
	}
	if result.Error != nil {
		return result.Error
	}

	now := time.Now()
	return r.db.Model(&domain.Card{}).
		Where("id = ? AND owner_id = ?", id, ownerID).
		Update("deleted_at", now).Error
}

func (r *CardRepo) CountPublicByOwner(ownerID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&domain.Card{}).
		Where("owner_id = ? AND is_public = true AND deleted_at IS NULL", ownerID).
		Count(&count).Error
	return count, err
}

func (r *CardRepo) IncrementViewCount(id uuid.UUID) error {
	return r.db.Model(&domain.Card{}).
		Where("id = ? AND deleted_at IS NULL", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}
