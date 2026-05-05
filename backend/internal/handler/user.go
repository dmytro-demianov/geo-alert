package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type UserHandler struct {
	users *repository.UserRepo
	cards *repository.CardRepo
}

func NewUserHandler(users *repository.UserRepo, cards *repository.CardRepo) *UserHandler {
	return &UserHandler{users: users, cards: cards}
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
