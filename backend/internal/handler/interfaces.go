package handler

import (
	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/google/uuid"
)

type likeStore interface {
	FindByUserAndMarker(userID, markerID uuid.UUID) (*domain.Like, error)
	Upsert(l *domain.Like) error
	Delete(userID, markerID uuid.UUID) error
}

type markerStore interface {
	FindByID(id uuid.UUID) (*domain.Marker, error)
}

type cardStore interface {
	Create(c *domain.Card) error
	FindPublic(limit, offset int) ([]domain.Card, error)
	FindByID(id uuid.UUID) (*domain.Card, error)
	IncrementViewCount(id uuid.UUID) error
	FindByOwnerID(ownerID uuid.UUID, limit, offset int) ([]domain.Card, error)
	Update(c *domain.Card) error
	Delete(id, ownerID uuid.UUID) error
}

type commentStore interface {
	FindByMarkerID(markerID uuid.UUID, f repository.CommentFilter) ([]domain.Comment, error)
	Create(c *domain.Comment) error
	FindByID(id uuid.UUID) (*domain.Comment, error)
	Delete(id uuid.UUID) error
}

type notifStore interface {
	Create(n *domain.Notification) error
}

type wsHub interface {
	Broadcast(msg []byte)
	SendToUser(userID uuid.UUID, msg []byte)
}
