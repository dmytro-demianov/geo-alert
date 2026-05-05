package handler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/internal/ws"
)

type LikeHandler struct {
	likes   *repository.LikeRepo
	markers *repository.MarkerRepo
	wsHub   *ws.Manager
}

func NewLikeHandler(likes *repository.LikeRepo, markers *repository.MarkerRepo, wsHub *ws.Manager) *LikeHandler {
	return &LikeHandler{likes: likes, markers: markers, wsHub: wsHub}
}

func (h *LikeHandler) broadcastLikeUpdate(markerID uuid.UUID, likeWeight int) {
	msg, _ := json.Marshal(map[string]any{
		"type":        "like_update",
		"marker_id":   markerID,
		"like_weight": likeWeight,
	})
	h.wsHub.Broadcast(msg)
}

type likeRequest struct {
	// "LIKE" | "DISLIKE"
	Type string `json:"type" binding:"required"`
}

// POST /markers/:id/likes
//
// Toggle semantics:
//   - If no existing like → create with given type.
//   - If existing like with same type → remove it (un-like / un-dislike).
//   - If existing like with different type → switch type.
func (h *LikeHandler) ToggleLike(c *gin.Context) {
	markerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	var req likeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var likeType domain.LikeType
	switch req.Type {
	case "LIKE":
		likeType = domain.LikeTypeLike
	case "DISLIKE":
		likeType = domain.LikeTypeDislike
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be LIKE or DISLIKE"})
		return
	}

	marker, err := h.markers.FindByID(markerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if marker == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "marker not found"})
		return
	}

	if !marker.AllowLikes {
		c.JSON(http.StatusForbidden, gin.H{"error": "likes are disabled for this marker"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	existing, err := h.likes.FindByUserAndMarker(userID, markerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Toggle: same type → remove reaction
	if existing != nil && existing.Type == likeType {
		if err := h.likes.Delete(userID, markerID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		// Re-fetch updated like_weight
		updated, _ := h.markers.FindByID(markerID)
		weight := marker.LikeWeight
		if updated != nil {
			weight = updated.LikeWeight
		}
		h.broadcastLikeUpdate(markerID, weight)
		c.JSON(http.StatusOK, gin.H{
			"action":      "removed",
			"like_weight": weight,
		})
		return
	}

	// Create or switch
	l := &domain.Like{
		ID:       uuid.New(),
		MarkerID: markerID,
		UserID:   userID,
		Type:     likeType,
	}
	if err := h.likes.Upsert(l); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Re-fetch updated like_weight
	updated, _ := h.markers.FindByID(markerID)
	weight := marker.LikeWeight
	if updated != nil {
		weight = updated.LikeWeight
	}

	action := "liked"
	if likeType == domain.LikeTypeDislike {
		action = "disliked"
	}

	h.broadcastLikeUpdate(markerID, weight)
	c.JSON(http.StatusOK, gin.H{
		"action":      action,
		"like_weight": weight,
		"user_like":   string(likeType),
	})
}
