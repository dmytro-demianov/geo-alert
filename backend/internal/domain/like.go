package domain

import (
	"time"

	"github.com/google/uuid"
)

type LikeType string

const (
	LikeTypeLike    LikeType = "LIKE"
	LikeTypeDislike LikeType = "DISLIKE"
)

type Like struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	MarkerID  uuid.UUID `gorm:"type:uuid;not null;index"`
	UserID    uuid.UUID `gorm:"type:uuid;not null"`
	Type      LikeType  `gorm:"type:like_type;not null"`
	CreatedAt time.Time
}
