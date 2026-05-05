package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type FeedHandler struct {
	feed *repository.FeedRepo
}

func NewFeedHandler(feed *repository.FeedRepo) *FeedHandler {
	return &FeedHandler{feed: feed}
}

// GET /feed?limit=20&before=<RFC3339>&before_id=<uuid>
func (h *FeedHandler) GetFeed(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	limit := 20
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}

	var cursor *repository.FeedCursor
	if beforeStr := c.Query("before"); beforeStr != "" {
		t, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid before timestamp"})
			return
		}
		beforeID, err := uuid.Parse(c.Query("before_id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "before_id required with before"})
			return
		}
		cursor = &repository.FeedCursor{Before: t, ID: beforeID}
	}

	markers, err := h.feed.FeedItems(userID, cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	items := make([]gin.H, 0, len(markers))
	for i := range markers {
		m := &markers[i]
		items = append(items, gin.H{
			"id":           m.ID,
			"card_id":      m.CardID,
			"created_by":   m.CreatedBy,
			"title":        m.Title,
			"description":  m.Description,
			"latitude":     m.Latitude,
			"longitude":    m.Longitude,
			"tags":         m.Tags,
			"images":       m.Images,
			"like_weight":  m.LikeWeight,
			"comment_count": m.CommentCount,
			"view_count":   m.ViewCount,
			"expires_at":   m.ExpiresAt,
			"created_at":   m.CreatedAt,
		})
	}

	var nextCursor *gin.H
	if len(markers) == limit {
		last := markers[len(markers)-1]
		nc := gin.H{
			"before":    last.CreatedAt.UTC().Format(time.RFC3339Nano),
			"before_id": last.ID,
		}
		nextCursor = &nc
	}

	c.JSON(http.StatusOK, gin.H{
		"items":       items,
		"next_cursor": nextCursor,
	})
}
