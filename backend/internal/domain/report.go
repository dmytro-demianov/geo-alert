package domain

import (
	"time"

	"github.com/google/uuid"
)

type Report struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey"`
	ReporterID uuid.UUID `gorm:"type:uuid;not null"`
	MarkerID   uuid.UUID `gorm:"type:uuid;not null"`
	Reason     string    `gorm:"not null"`
	Comment    string
	CreatedAt  time.Time
}
