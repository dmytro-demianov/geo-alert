package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type NotificationHandler struct {
	notifs *repository.NotificationRepo
}

func NewNotificationHandler(notifs *repository.NotificationRepo) *NotificationHandler {
	return &NotificationHandler{notifs: notifs}
}

// GET /notifications?limit=20&before=<ISO8601>
func (h *NotificationHandler) List(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	limit := 20
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}

	var before *time.Time
	if b := c.Query("before"); b != "" {
		if t, err := time.Parse(time.RFC3339, b); err == nil {
			before = &t
		}
	}

	notifications, err := h.notifs.FindByUserID(userID, limit, before)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	result := make([]gin.H, 0, len(notifications))
	for i := range notifications {
		n := &notifications[i]
		result = append(result, gin.H{
			"id":                n.ID,
			"type":              n.Type,
			"related_marker_id": n.RelatedMarkerID,
			"related_card_id":   n.RelatedCardID,
			"related_user_id":   n.RelatedUserID,
			"message":           n.Message,
			"is_read":           n.IsRead,
			"created_at":        n.CreatedAt,
		})
	}

	hasMore := len(notifications) == limit

	c.JSON(http.StatusOK, gin.H{
		"notifications": result,
		"has_more":      hasMore,
	})
}

// GET /notifications/unread-count
func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	count, err := h.notifs.CountUnread(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// PUT /notifications/:id/read
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid notification id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	if err := h.notifs.MarkRead(id, userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// PUT /notifications/read-all
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	if err := h.notifs.MarkAllRead(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
