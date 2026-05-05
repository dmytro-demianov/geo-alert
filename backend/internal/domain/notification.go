package domain

import (
	"time"

	"github.com/google/uuid"
)

type NotificationEventType string

const (
	NotifGeoEnter              NotificationEventType = "GEO_ENTER"
	NotifGeoApproach           NotificationEventType = "GEO_APPROACH"
	NotifNewLike               NotificationEventType = "NEW_LIKE"
	NotifNewComment            NotificationEventType = "NEW_COMMENT"
	NotifNewMention            NotificationEventType = "NEW_MENTION"
	NotifCardPrivate           NotificationEventType = "CARD_PRIVATE"
	NotifMarkerDeletedInRadius NotificationEventType = "MARKER_DELETED_IN_RADIUS"
	NotifReportReceived        NotificationEventType = "REPORT_RECEIVED"
	NotifNewSubscriber         NotificationEventType = "NEW_SUBSCRIBER"
)

type Notification struct {
	ID              uuid.UUID             `gorm:"type:uuid;primaryKey"`
	UserID          uuid.UUID             `gorm:"type:uuid;not null"`
	Type            NotificationEventType `gorm:"type:notification_event_type;not null"`
	RelatedMarkerID *uuid.UUID            `gorm:"type:uuid"`
	RelatedCardID   *uuid.UUID            `gorm:"type:uuid"`
	RelatedUserID   *uuid.UUID            `gorm:"type:uuid"`
	Message         string                `gorm:"not null"`
	IsRead          bool                  `gorm:"default:false"`
	CreatedAt       time.Time
}
