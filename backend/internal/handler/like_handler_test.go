package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

func newLikeRouter(h *LikeHandler) *gin.Engine {
	userID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	r := gin.New()
	r.POST("/markers/:id/likes", func(c *gin.Context) {
		c.Set("user_id", userID)
		h.ToggleLike(c)
	})
	return r
}

func newMarker(id uuid.UUID, allowLikes bool) *domain.Marker {
	ownerID := uuid.MustParse("bbbbbbbb-0000-0000-0000-000000000002")
	return &domain.Marker{
		ID:         id,
		CreatedBy:  ownerID,
		AllowLikes: allowLikes,
		LikeWeight: 0,
	}
}

func TestToggleLike_Create(t *testing.T) {
	markerID := uuid.New()
	upsertCalled := false

	h := &LikeHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return newMarker(id, true), nil
			},
		},
		likes: &mockLikeStore{
			findByUserAndMarker: func(userID, markerID uuid.UUID) (*domain.Like, error) {
				return nil, nil
			},
			upsert: func(l *domain.Like) error {
				upsertCalled = true
				if l.Type != domain.LikeTypeLike {
					t.Errorf("expected LIKE, got %v", l.Type)
				}
				return nil
			},
		},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newLikeRouter(h)

	body, _ := json.Marshal(map[string]string{"type": "LIKE"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/likes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !upsertCalled {
		t.Fatal("Upsert was not called")
	}
}

func TestToggleLike_Remove_SameType(t *testing.T) {
	markerID := uuid.New()
	userID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	deleteCalled := false

	existingLike := &domain.Like{UserID: userID, MarkerID: markerID, Type: domain.LikeTypeLike}

	h := &LikeHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return newMarker(id, true), nil
			},
		},
		likes: &mockLikeStore{
			findByUserAndMarker: func(uid, mid uuid.UUID) (*domain.Like, error) {
				return existingLike, nil
			},
			delete: func(uid, mid uuid.UUID) error {
				deleteCalled = true
				return nil
			},
		},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newLikeRouter(h)

	body, _ := json.Marshal(map[string]string{"type": "LIKE"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/likes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !deleteCalled {
		t.Fatal("Delete was not called for toggle-remove")
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["action"] != "removed" {
		t.Errorf("expected action=removed, got %v", resp["action"])
	}
}

func TestToggleLike_LikesDisabled(t *testing.T) {
	markerID := uuid.New()
	h := &LikeHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return newMarker(id, false), nil
			},
		},
		likes:     &mockLikeStore{},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newLikeRouter(h)

	body, _ := json.Marshal(map[string]string{"type": "LIKE"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/likes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestToggleLike_InvalidType(t *testing.T) {
	markerID := uuid.New()
	h := &LikeHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return newMarker(id, true), nil
			},
		},
		likes:     &mockLikeStore{findByUserAndMarker: func(a, b uuid.UUID) (*domain.Like, error) { return nil, nil }},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newLikeRouter(h)

	body, _ := json.Marshal(map[string]string{"type": "NEUTRAL"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/likes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestToggleLike_MarkerNotFound(t *testing.T) {
	h := &LikeHandler{
		markers:   &mockMarkerStore{findByID: func(id uuid.UUID) (*domain.Marker, error) { return nil, nil }},
		likes:     &mockLikeStore{},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newLikeRouter(h)

	body, _ := json.Marshal(map[string]string{"type": "LIKE"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+uuid.New().String()+"/likes", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}
