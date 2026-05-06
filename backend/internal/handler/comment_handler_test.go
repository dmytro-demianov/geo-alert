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
	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

func newCommentRouter(h *CommentHandler) *gin.Engine {
	userID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	r := gin.New()
	r.GET("/markers/:id/comments", h.ListComments)
	r.POST("/markers/:id/comments", func(c *gin.Context) {
		c.Set("user_id", userID)
		h.CreateComment(c)
	})
	r.DELETE("/comments/:id", func(c *gin.Context) {
		c.Set("user_id", userID)
		h.DeleteComment(c)
	})
	return r
}

func makeMarkerAllowComments(id uuid.UUID) *domain.Marker {
	ownerID := uuid.MustParse("cccccccc-0000-0000-0000-000000000003")
	return &domain.Marker{ID: id, CreatedBy: ownerID, AllowComments: true}
}

func TestListComments_OK(t *testing.T) {
	markerID := uuid.New()
	h := &CommentHandler{
		comments: &mockCommentStore{
			findByMarkerID: func(mid uuid.UUID, f repository.CommentFilter) ([]domain.Comment, error) {
				return []domain.Comment{{ID: uuid.New(), MarkerID: mid, Text: "hello"}}, nil
			},
		},
		markers:   &mockMarkerStore{},
		cards:     &mockCardStore{},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newCommentRouter(h)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/markers/"+markerID.String()+"/comments", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if _, ok := resp["comments"]; !ok {
		t.Fatalf("response missing 'comments' key: %v", resp)
	}
}

func TestCreateComment_OK(t *testing.T) {
	markerID := uuid.New()
	createCalled := false

	h := &CommentHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return makeMarkerAllowComments(id), nil
			},
		},
		comments: &mockCommentStore{
			create: func(c *domain.Comment) error {
				createCalled = true
				return nil
			},
		},
		cards:     &mockCardStore{findByID: func(id uuid.UUID) (*domain.Card, error) { return nil, nil }},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newCommentRouter(h)

	body, _ := json.Marshal(map[string]string{"text": "nice marker!"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/comments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	if !createCalled {
		t.Fatal("comment Create was not called")
	}
}

func TestCreateComment_TextTooLong(t *testing.T) {
	markerID := uuid.New()
	h := &CommentHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return makeMarkerAllowComments(id), nil
			},
		},
		comments:  &mockCommentStore{},
		cards:     &mockCardStore{},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newCommentRouter(h)

	longText := make([]rune, 501)
	for i := range longText {
		longText[i] = 'я'
	}
	body, _ := json.Marshal(map[string]string{"text": string(longText)})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/comments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCreateComment_CommentsDisabled(t *testing.T) {
	markerID := uuid.New()
	h := &CommentHandler{
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				m := makeMarkerAllowComments(id)
				m.AllowComments = false
				return m, nil
			},
		},
		comments:  &mockCommentStore{},
		cards:     &mockCardStore{},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newCommentRouter(h)

	body, _ := json.Marshal(map[string]string{"text": "hello"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/markers/"+markerID.String()+"/comments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestDeleteComment_Forbidden_NonOwner(t *testing.T) {
	commentID := uuid.New()
	otherUserID := uuid.New() // comment belongs to another user
	markerID := uuid.New()
	cardID := uuid.New()
	callerID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")

	h := &CommentHandler{
		comments: &mockCommentStore{
			findByID: func(id uuid.UUID) (*domain.Comment, error) {
				return &domain.Comment{ID: id, UserID: otherUserID, MarkerID: markerID}, nil
			},
		},
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return &domain.Marker{ID: markerID, CardID: cardID, CreatedBy: otherUserID, AllowComments: true}, nil
			},
		},
		cards: &mockCardStore{
			findByID: func(id uuid.UUID) (*domain.Card, error) {
				return &domain.Card{ID: cardID, OwnerID: otherUserID}, nil
			},
		},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	_ = callerID
	r := newCommentRouter(h)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/comments/"+commentID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestDeleteComment_ByAuthor(t *testing.T) {
	commentID := uuid.New()
	callerID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	markerID := uuid.New()
	cardID := uuid.New()
	deleteCalled := false

	h := &CommentHandler{
		comments: &mockCommentStore{
			findByID: func(id uuid.UUID) (*domain.Comment, error) {
				return &domain.Comment{ID: id, UserID: callerID, MarkerID: markerID}, nil
			},
			delete: func(id uuid.UUID) error {
				deleteCalled = true
				return nil
			},
		},
		markers: &mockMarkerStore{
			findByID: func(id uuid.UUID) (*domain.Marker, error) {
				return &domain.Marker{ID: markerID, CardID: cardID, CreatedBy: uuid.New(), AllowComments: true}, nil
			},
		},
		cards: &mockCardStore{
			findByID: func(id uuid.UUID) (*domain.Card, error) {
				return &domain.Card{ID: cardID, OwnerID: uuid.New()}, nil
			},
		},
		notifRepo: &mockNotifStore{create: func(n *domain.Notification) error { return nil }},
		wsHub:     &mockWsHub{broadcast: func(msg []byte) {}, sendToUser: func(id uuid.UUID, msg []byte) {}},
	}
	r := newCommentRouter(h)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/comments/"+commentID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if !deleteCalled {
		t.Fatal("Delete was not called")
	}
}
