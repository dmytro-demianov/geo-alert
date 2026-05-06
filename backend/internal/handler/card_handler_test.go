package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newCardRouter(h *CardHandler) *gin.Engine {
	r := gin.New()
	r.POST("/cards", func(c *gin.Context) {
		c.Set("user_id", uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"))
		h.CreateCard(c)
	})
	r.GET("/cards", h.ListPublic)
	r.GET("/cards/:id", h.GetCard)
	r.PUT("/cards/:id", func(c *gin.Context) {
		c.Set("user_id", uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"))
		h.UpdateCard(c)
	})
	r.DELETE("/cards/:id", func(c *gin.Context) {
		c.Set("user_id", uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001"))
		h.DeleteCard(c)
	})
	return r
}

func TestCreateCard_OK(t *testing.T) {
	ownerID := uuid.MustParse("aaaaaaaa-0000-0000-0000-000000000001")
	store := &mockCardStore{
		create: func(c *domain.Card) error {
			if c.OwnerID != ownerID {
				t.Errorf("unexpected owner id: %v", c.OwnerID)
			}
			if c.Title != "Test" {
				t.Errorf("unexpected title: %v", c.Title)
			}
			return nil
		},
	}
	r := newCardRouter(&CardHandler{cards: store})

	body, _ := json.Marshal(map[string]any{"title": "Test", "is_public": true})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestCreateCard_MissingTitle(t *testing.T) {
	store := &mockCardStore{create: func(c *domain.Card) error { return nil }}
	r := newCardRouter(&CardHandler{cards: store})

	body, _ := json.Marshal(map[string]any{"description": "no title"})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestCreateCard_TitleTooLong(t *testing.T) {
	store := &mockCardStore{create: func(c *domain.Card) error { return nil }}
	r := newCardRouter(&CardHandler{cards: store})

	longTitle := make([]byte, 201)
	for i := range longTitle {
		longTitle[i] = 'a'
	}
	body, _ := json.Marshal(map[string]any{"title": string(longTitle)})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestGetCard_NotFound(t *testing.T) {
	store := &mockCardStore{
		findByID: func(id uuid.UUID) (*domain.Card, error) { return nil, nil },
	}
	r := newCardRouter(&CardHandler{cards: store})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/cards/"+uuid.New().String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetCard_PrivateForbiddenAnon(t *testing.T) {
	cardID := uuid.New()
	ownerID := uuid.New()
	store := &mockCardStore{
		findByID: func(id uuid.UUID) (*domain.Card, error) {
			return &domain.Card{ID: cardID, OwnerID: ownerID, IsPublic: false, Title: "secret"}, nil
		},
	}
	// No user_id in context → anonymous request
	r := gin.New()
	r.GET("/cards/:id", func(c *gin.Context) {
		h := &CardHandler{cards: store}
		h.GetCard(c)
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/cards/"+cardID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestGetCard_Public(t *testing.T) {
	cardID := uuid.New()
	store := &mockCardStore{
		findByID:           func(id uuid.UUID) (*domain.Card, error) {
			return &domain.Card{ID: cardID, IsPublic: true, Title: "pub"}, nil
		},
		incrementViewCount: func(id uuid.UUID) error { return nil },
	}
	r := newCardRouter(&CardHandler{cards: store})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/cards/"+cardID.String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDeleteCard_Forbidden(t *testing.T) {
	store := &mockCardStore{
		delete: func(id, ownerID uuid.UUID) error { return gorm.ErrRecordNotFound },
	}
	r := newCardRouter(&CardHandler{cards: store})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodDelete, "/cards/"+uuid.New().String(), nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", w.Code)
	}
}

func TestListPublic(t *testing.T) {
	store := &mockCardStore{
		findPublic: func(limit, offset int) ([]domain.Card, error) {
			return []domain.Card{{ID: uuid.New(), Title: "c1", IsPublic: true}}, nil
		},
	}
	r := newCardRouter(&CardHandler{cards: store})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/cards", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	cards, ok := resp["cards"].([]any)
	if !ok || len(cards) != 1 {
		t.Fatalf("expected 1 card in response, got %v", resp)
	}
}
