package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

// viewCache deduplicates views per session within a TTL window.
type viewCache struct {
	mu      sync.Mutex
	entries map[string]time.Time
	ttl     time.Duration
}

func newViewCache(ttl time.Duration) *viewCache {
	vc := &viewCache{entries: make(map[string]time.Time), ttl: ttl}
	go vc.purge()
	return vc
}

func (vc *viewCache) seen(key string) bool {
	vc.mu.Lock()
	defer vc.mu.Unlock()
	if exp, ok := vc.entries[key]; ok && time.Now().Before(exp) {
		return true
	}
	vc.entries[key] = time.Now().Add(vc.ttl)
	return false
}

func (vc *viewCache) purge() {
	t := time.NewTicker(vc.ttl)
	for range t.C {
		now := time.Now()
		vc.mu.Lock()
		for k, exp := range vc.entries {
			if now.After(exp) {
				delete(vc.entries, k)
			}
		}
		vc.mu.Unlock()
	}
}

type ViewHandler struct {
	markers *repository.MarkerRepo
	cache   *viewCache
}

func NewViewHandler(markers *repository.MarkerRepo) *ViewHandler {
	return &ViewHandler{
		markers: markers,
		cache:   newViewCache(time.Hour),
	}
}

// RecordView handles POST /markers/:id/views.
// Client must pass X-Session-ID header (UUID stored client-side).
// If the session already viewed this marker within the TTL, the call is a no-op.
func (h *ViewHandler) RecordView(c *gin.Context) {
	markerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "X-Session-ID header required"})
		return
	}

	key := markerID.String() + ":" + sessionID
	if !h.cache.seen(key) {
		_ = h.markers.IncrementViewCount(markerID)
	}

	c.JSON(http.StatusNoContent, nil)
}
