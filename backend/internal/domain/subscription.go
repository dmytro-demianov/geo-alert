package domain

import (
	"time"

	"github.com/google/uuid"
)

type Subscription struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID       uuid.UUID  `gorm:"type:uuid;not null;index"`
	TargetCardID *uuid.UUID `gorm:"type:uuid"`
	TargetUserID *uuid.UUID `gorm:"type:uuid"`
	CreatedAt    time.Time
}
