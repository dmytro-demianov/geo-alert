package domain

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type NotificationType string

const (
	NotificationTypeOnEnter   NotificationType = "ON_ENTER"
	NotificationTypeOnApproach NotificationType = "ON_APPROACH"
	NotificationTypeBoth      NotificationType = "BOTH"
)

type ExpirationType string

const (
	ExpirationTypeEternal   ExpirationType = "ETERNAL"
	ExpirationTypeUntilTime ExpirationType = "UNTIL_TIME"
	ExpirationTypePeriod    ExpirationType = "PERIOD"
	ExpirationTypeEndOfDay  ExpirationType = "END_OF_DAY"
)

type Marker struct {
	ID                   uuid.UUID        `gorm:"type:uuid;primaryKey"`
	CardID               uuid.UUID        `gorm:"type:uuid;not null;index"`
	CreatedBy            uuid.UUID        `gorm:"type:uuid;not null;index"`
	Title                string           `gorm:"not null"`
	Description          string
	Latitude             float64          `gorm:"not null"`
	Longitude            float64          `gorm:"not null"`
	Images               pq.StringArray   `gorm:"type:text[]"`
	Tags                 pq.StringArray   `gorm:"type:text[]"`
	LikeWeight           int              `gorm:"default:0"`
	CommentCount         int              `gorm:"default:0"`
	ViewCount            int64            `gorm:"default:0"`
	AllowComments        bool             `gorm:"default:true"`
	AllowLikes           bool             `gorm:"default:true"`
	IsDraft              bool             `gorm:"default:false"`
	NotificationsEnabled bool             `gorm:"default:true"`
	NotificationType     NotificationType `gorm:"type:notification_type;default:'ON_ENTER'"`
	ExpiresAt            *time.Time
	ExpirationType       ExpirationType   `gorm:"type:expiration_type;default:'ETERNAL'"`
	DeletedAt            *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
