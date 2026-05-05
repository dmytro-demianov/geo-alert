package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                 uuid.UUID  `gorm:"type:uuid;primaryKey"`
	GoogleID           string     `gorm:"uniqueIndex;not null"`
	Email              string     `gorm:"uniqueIndex;not null"`
	DisplayName        string     `gorm:"not null"`
	AvatarURL          string
	Bio                string
	IsPrivate          bool       `gorm:"default:false"`
	BrowserFingerprint string
	FCMToken           string
	DeletedAt          *time.Time
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
