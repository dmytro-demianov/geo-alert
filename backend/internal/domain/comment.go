package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Comment struct {
	ID        uuid.UUID      `gorm:"type:uuid;primaryKey"`
	MarkerID  uuid.UUID      `gorm:"type:uuid;not null;index"`
	UserID    uuid.UUID      `gorm:"type:uuid;not null"`
	Text      string         `gorm:"type:varchar(500);not null"`
	Mentions  pq.StringArray `gorm:"type:uuid[]"`
	DeletedAt *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
}
