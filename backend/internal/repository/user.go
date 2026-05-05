package repository

import (
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

type UserRepo struct {
	db *gorm.DB
}

func NewUserRepo(db *gorm.DB) *UserRepo {
	return &UserRepo{db: db}
}

func (r *UserRepo) FindByGoogleID(googleID string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("google_id = ?", googleID).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepo) FindByID(id uuid.UUID) (*domain.User, error) {
	var user domain.User
	err := r.db.First(&user, "id = ?", id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &user, err
}

func (r *UserRepo) Upsert(user *domain.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepo) UpdateProfile(id uuid.UUID, displayName, bio, avatarURL string) error {
	return r.db.Model(&domain.User{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"display_name": displayName,
			"bio":          bio,
			"avatar_url":   avatarURL,
			"updated_at":   gorm.Expr("NOW()"),
		}).Error
}

func (r *UserRepo) UpdateFCMToken(id uuid.UUID, token string) error {
	return r.db.Model(&domain.User{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Update("fcm_token", token).Error
}

func (r *UserRepo) ClearFCMToken(id uuid.UUID) error {
	return r.db.Model(&domain.User{}).
		Where("id = ?", id).
		Update("fcm_token", "").Error
}

func (r *UserRepo) FindByFCMToken(token string) ([]domain.User, error) {
	var users []domain.User
	err := r.db.Where("fcm_token = ? AND deleted_at IS NULL", token).Find(&users).Error
	return users, err
}

func (r *UserRepo) SoftDelete(id uuid.UUID) error {
	return r.db.Model(&domain.User{}).
		Where("id = ? AND deleted_at IS NULL", id).
		Updates(map[string]interface{}{
			"deleted_at": gorm.Expr("NOW()"),
			"fcm_token":  "",
		}).Error
}
