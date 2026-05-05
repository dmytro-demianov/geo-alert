package handler

import (
	"net/http"
	"strconv"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type CommentHandler struct {
	comments *repository.CommentRepo
	markers  *repository.MarkerRepo
	cards    *repository.CardRepo
}

func NewCommentHandler(
	comments *repository.CommentRepo,
	markers *repository.MarkerRepo,
	cards *repository.CardRepo,
) *CommentHandler {
	return &CommentHandler{comments: comments, markers: markers, cards: cards}
}

func commentResponse(c *domain.Comment) gin.H {
	return gin.H{
		"id":         c.ID,
		"marker_id":  c.MarkerID,
		"user_id":    c.UserID,
		"text":       c.Text,
		"mentions":   c.Mentions,
		"created_at": c.CreatedAt,
		"updated_at": c.UpdatedAt,
	}
}

// GET /markers/:id/comments?limit=20&cursor=<RFC3339>
func (h *CommentHandler) ListComments(c *gin.Context) {
	markerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	f := repository.CommentFilter{Limit: 20}
	if l := c.Query("limit"); l != "" {
		if v, _ := strconv.Atoi(l); v > 0 {
			f.Limit = v
		}
	}
	if cursor := c.Query("cursor"); cursor != "" {
		if t, err := time.Parse(time.RFC3339, cursor); err == nil {
			f.Cursor = &t
		}
	}

	comments, err := h.comments.FindByMarkerID(markerID, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	result := make([]gin.H, 0, len(comments))
	for i := range comments {
		result = append(result, commentResponse(&comments[i]))
	}

	var nextCursor *string
	if len(comments) == f.Limit {
		last := comments[len(comments)-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &last
	}

	c.JSON(http.StatusOK, gin.H{"comments": result, "next_cursor": nextCursor})
}

// POST /markers/:id/comments
func (h *CommentHandler) CreateComment(c *gin.Context) {
	markerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	var req struct {
		Text string `json:"text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if utf8.RuneCountInString(req.Text) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text must not exceed 500 characters"})
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
	if !marker.AllowComments {
		c.JSON(http.StatusForbidden, gin.H{"error": "comments are disabled for this marker"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	mentions := repository.ExtractMentions(req.Text)

	comment := &domain.Comment{
		ID:       uuid.New(),
		MarkerID: markerID,
		UserID:   userID,
		Text:     req.Text,
		Mentions: mentions,
	}

	if err := h.comments.Create(comment); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// TODO: send notification to marker author and mentioned users (TASK-4.4)

	c.JSON(http.StatusCreated, commentResponse(comment))
}

// DELETE /comments/:id
func (h *CommentHandler) DeleteComment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	comment, err := h.comments.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if comment == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "comment not found"})
		return
	}

	// Determine if caller is card owner
	isCardOwner := false
	marker, err := h.markers.FindByID(comment.MarkerID)
	if err == nil && marker != nil {
		card, err := h.cards.FindByID(marker.CardID)
		if err == nil && card != nil && card.OwnerID == userID {
			isCardOwner = true
		}
	}

	if comment.UserID != userID && !isCardOwner {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err := h.comments.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
