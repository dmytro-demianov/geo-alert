package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RefreshToken struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null"`
	TokenHash string    `gorm:"uniqueIndex;not null"`
	FCMToken  string
	ExpiresAt time.Time `gorm:"not null"`
	CreatedAt time.Time
}

type RefreshTokenRepo struct {
	db *gorm.DB
}

func NewRefreshTokenRepo(db *gorm.DB) *RefreshTokenRepo {
	return &RefreshTokenRepo{db: db}
}

func (r *RefreshTokenRepo) Create(token *RefreshToken) error {
	return r.db.Create(token).Error
}

func (r *RefreshTokenRepo) FindByHash(hash string) (*RefreshToken, error) {
	var t RefreshToken
	err := r.db.Where("token_hash = ? AND expires_at > NOW()", hash).First(&t).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &t, err
}

func (r *RefreshTokenRepo) DeleteByHash(hash string) error {
	return r.db.Where("token_hash = ?", hash).Delete(&RefreshToken{}).Error
}

func (r *RefreshTokenRepo) DeleteByUserID(userID uuid.UUID) error {
	return r.db.Where("user_id = ?", userID).Delete(&RefreshToken{}).Error
}
