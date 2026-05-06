package handler

import (
	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/google/uuid"
)

// ---------- likeStore mock ----------

type mockLikeStore struct {
	findByUserAndMarker func(userID, markerID uuid.UUID) (*domain.Like, error)
	upsert              func(l *domain.Like) error
	delete              func(userID, markerID uuid.UUID) error
}

func (m *mockLikeStore) FindByUserAndMarker(userID, markerID uuid.UUID) (*domain.Like, error) {
	return m.findByUserAndMarker(userID, markerID)
}
func (m *mockLikeStore) Upsert(l *domain.Like) error { return m.upsert(l) }
func (m *mockLikeStore) Delete(userID, markerID uuid.UUID) error {
	return m.delete(userID, markerID)
}

// ---------- markerStore mock ----------

type mockMarkerStore struct {
	findByID func(id uuid.UUID) (*domain.Marker, error)
}

func (m *mockMarkerStore) FindByID(id uuid.UUID) (*domain.Marker, error) {
	return m.findByID(id)
}

// ---------- cardStore mock ----------

type mockCardStore struct {
	create             func(c *domain.Card) error
	findPublic         func(limit, offset int) ([]domain.Card, error)
	findByID           func(id uuid.UUID) (*domain.Card, error)
	incrementViewCount func(id uuid.UUID) error
	findByOwnerID      func(ownerID uuid.UUID, limit, offset int) ([]domain.Card, error)
	update             func(c *domain.Card) error
	delete             func(id, ownerID uuid.UUID) error
}

func (m *mockCardStore) Create(c *domain.Card) error                    { return m.create(c) }
func (m *mockCardStore) FindPublic(limit, offset int) ([]domain.Card, error) {
	return m.findPublic(limit, offset)
}
func (m *mockCardStore) FindByID(id uuid.UUID) (*domain.Card, error) { return m.findByID(id) }
func (m *mockCardStore) IncrementViewCount(id uuid.UUID) error        { return m.incrementViewCount(id) }
func (m *mockCardStore) FindByOwnerID(ownerID uuid.UUID, limit, offset int) ([]domain.Card, error) {
	return m.findByOwnerID(ownerID, limit, offset)
}
func (m *mockCardStore) Update(c *domain.Card) error            { return m.update(c) }
func (m *mockCardStore) Delete(id, ownerID uuid.UUID) error     { return m.delete(id, ownerID) }

// ---------- commentStore mock ----------

type mockCommentStore struct {
	findByMarkerID func(markerID uuid.UUID, f repository.CommentFilter) ([]domain.Comment, error)
	create         func(c *domain.Comment) error
	findByID       func(id uuid.UUID) (*domain.Comment, error)
	delete         func(id uuid.UUID) error
}

func (m *mockCommentStore) FindByMarkerID(markerID uuid.UUID, f repository.CommentFilter) ([]domain.Comment, error) {
	return m.findByMarkerID(markerID, f)
}
func (m *mockCommentStore) Create(c *domain.Comment) error       { return m.create(c) }
func (m *mockCommentStore) FindByID(id uuid.UUID) (*domain.Comment, error) {
	return m.findByID(id)
}
func (m *mockCommentStore) Delete(id uuid.UUID) error { return m.delete(id) }

// ---------- notifStore mock ----------

type mockNotifStore struct {
	create func(n *domain.Notification) error
}

func (m *mockNotifStore) Create(n *domain.Notification) error { return m.create(n) }

// ---------- wsHub mock ----------

type mockWsHub struct {
	broadcast  func(msg []byte)
	sendToUser func(userID uuid.UUID, msg []byte)
}

func (m *mockWsHub) Broadcast(msg []byte)                   { m.broadcast(msg) }
func (m *mockWsHub) SendToUser(userID uuid.UUID, msg []byte) { m.sendToUser(userID, msg) }
