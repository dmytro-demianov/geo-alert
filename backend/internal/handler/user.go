package handler

import (
	"net/http"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type UserHandler struct {
	users  *repository.UserRepo
	cards  *repository.CardRepo
	tokens *repository.RefreshTokenRepo
}

func NewUserHandler(users *repository.UserRepo, cards *repository.CardRepo, tokens *repository.RefreshTokenRepo) *UserHandler {
	return &UserHandler{users: users, cards: cards, tokens: tokens}
}

// PUT /users/me
func (h *UserHandler) UpdateMe(c *gin.Context) {
	var req struct {
		DisplayName string `json:"display_name"`
		Bio         string `json:"bio"`
		AvatarURL   string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.DisplayName != "" && utf8.RuneCountInString(req.DisplayName) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "display_name too long (max 100)"})
		return
	}
	if utf8.RuneCountInString(req.Bio) > 150 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bio too long (max 150)"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	user, err := h.users.FindByID(userID)
	if err != nil || user == nil || user.DeletedAt != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	displayName := user.DisplayName
	if req.DisplayName != "" {
		displayName = req.DisplayName
	}
	bio := req.Bio
	if req.DisplayName == "" && req.Bio == "" && req.AvatarURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nothing to update"})
		return
	}
	if req.Bio == "" {
		bio = user.Bio
	}
	avatarURL := req.AvatarURL
	if avatarURL == "" {
		avatarURL = user.AvatarURL
	}

	if err := h.users.UpdateProfile(userID, displayName, bio, avatarURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":           userID,
		"display_name": displayName,
		"bio":          bio,
		"avatar_url":   avatarURL,
	})
}

// DELETE /users/me
func (h *UserHandler) DeleteMe(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	user, err := h.users.FindByID(userID)
	if err != nil || user == nil || user.DeletedAt != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Cascade soft-delete cards (markers inaccessible via card FK)
	if err := h.cards.SoftDeleteByOwner(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Invalidate all sessions
	_ = h.tokens.DeleteByUserID(userID)

	// Soft-delete user + clear FCM token
	if err := h.users.SoftDelete(userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /users/:id
func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := h.users.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	if user.DeletedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"id":           user.ID,
			"display_name": "Удалённый пользователь",
			"deleted":      true,
		})
		return
	}

	cardCount, _ := h.cards.CountPublicByOwner(id)

	c.JSON(http.StatusOK, gin.H{
		"id":           user.ID,
		"display_name": user.DisplayName,
		"avatar_url":   user.AvatarURL,
		"bio":          user.Bio,
		"is_private":   user.IsPrivate,
		"card_count":   cardCount,
		"created_at":   user.CreatedAt,
		"deleted":      false,
	})
}
