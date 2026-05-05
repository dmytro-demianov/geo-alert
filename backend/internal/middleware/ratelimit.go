package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// bucket is a sliding-window counter for one key.
type bucket struct {
	mu        sync.Mutex
	timestamps []time.Time
}

func (b *bucket) allow(limit int, window time.Duration) (bool, time.Duration) {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)

	// Drop timestamps outside the window.
	fresh := b.timestamps[:0]
	for _, t := range b.timestamps {
		if t.After(cutoff) {
			fresh = append(fresh, t)
		}
	}
	b.timestamps = fresh

	if len(b.timestamps) >= limit {
		// Retry after the oldest timestamp leaves the window.
		retryAfter := b.timestamps[0].Add(window).Sub(now)
		return false, retryAfter
	}

	b.timestamps = append(b.timestamps, now)
	return true, 0
}

// store holds per-key buckets with periodic GC.
type store struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	window  time.Duration
}

func newStore(window time.Duration) *store {
	s := &store{buckets: make(map[string]*bucket), window: window}
	go s.gc()
	return s
}

func (s *store) get(key string) *bucket {
	s.mu.Lock()
	defer s.mu.Unlock()
	b, ok := s.buckets[key]
	if !ok {
		b = &bucket{}
		s.buckets[key] = b
	}
	return b
}

func (s *store) gc() {
	t := time.NewTicker(s.window)
	for range t.C {
		cutoff := time.Now().Add(-s.window)
		s.mu.Lock()
		for key, b := range s.buckets {
			b.mu.Lock()
			allOld := len(b.timestamps) == 0 || b.timestamps[len(b.timestamps)-1].Before(cutoff)
			b.mu.Unlock()
			if allOld {
				delete(s.buckets, key)
			}
		}
		s.mu.Unlock()
	}
}

// RateLimitConfig defines a limit rule.
type RateLimitConfig struct {
	Limit  int
	Window time.Duration
}

var defaultConfig = RateLimitConfig{Limit: 60, Window: time.Minute}

// Predefined per-endpoint configs.
var endpointConfigs = map[string]RateLimitConfig{
	// POST /cards/:id/markers — 20 markers/hour
	"POST:/cards/:id/markers": {Limit: 20, Window: time.Hour},
	// POST /markers/:id/likes — 100 likes/hour
	"POST:/markers/:id/likes": {Limit: 100, Window: time.Hour},
	// POST /markers/:id/comments — 60 comments/hour
	"POST:/markers/:id/comments": {Limit: 60, Window: time.Hour},
	// POST /auth/google — 10/min (brute-force protection)
	"POST:/auth/google": {Limit: 10, Window: time.Minute},
}

var globalStore = newStore(time.Hour)

// RateLimit returns a Gin middleware that applies sliding-window rate limiting.
// Key is IP + method + route pattern. Per-endpoint limits override the default.
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		routeKey := c.Request.Method + ":" + c.FullPath()
		cfg, ok := endpointConfigs[routeKey]
		if !ok {
			cfg = defaultConfig
		}

		ip := c.ClientIP()
		key := ip + "|" + routeKey

		b := globalStore.get(key)
		allowed, retryAfter := b.allow(cfg.Limit, cfg.Window)
		if !allowed {
			secs := int(retryAfter.Seconds()) + 1
			c.Header("Retry-After", itoa(secs))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "too many requests",
				"retry_after": secs,
			})
			return
		}

		c.Next()
	}
}

func itoa(n int) string {
	if n <= 0 {
		return "1"
	}
	buf := make([]byte, 0, 10)
	for n > 0 {
		buf = append([]byte{byte('0' + n%10)}, buf...)
		n /= 10
	}
	return string(buf)
}
