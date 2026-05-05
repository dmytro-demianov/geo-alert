package domain

import (
	"time"

	"github.com/google/uuid"
)

type Card struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	OwnerID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	Title       string     `gorm:"not null"`
	Description string
	IsPublic    bool       `gorm:"default:true"`
	TTLHours    int        `gorm:"default:0"`
	ViewCount   int64      `gorm:"default:0"`
	DeletedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
