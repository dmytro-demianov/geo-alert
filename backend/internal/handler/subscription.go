package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/internal/ws"
)

type SubscriptionHandler struct {
	subs      *repository.SubscriptionRepo
	cards     *repository.CardRepo
	wsHub     *ws.Manager
	notifRepo *repository.NotificationRepo
}

func NewSubscriptionHandler(subs *repository.SubscriptionRepo, cards *repository.CardRepo, wsHub *ws.Manager, notifRepo *repository.NotificationRepo) *SubscriptionHandler {
	return &SubscriptionHandler{subs: subs, cards: cards, wsHub: wsHub, notifRepo: notifRepo}
}

type createSubscriptionRequest struct {
	TargetCardID *string `json:"target_card_id"`
	TargetUserID *string `json:"target_user_id"`
}

func subResponse(s *domain.Subscription) gin.H {
	return gin.H{
		"id":             s.ID,
		"user_id":        s.UserID,
		"target_card_id": s.TargetCardID,
		"target_user_id": s.TargetUserID,
		"created_at":     s.CreatedAt,
	}
}

// POST /subscriptions
func (h *SubscriptionHandler) Subscribe(c *gin.Context) {
	var req createSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.TargetCardID == nil && req.TargetUserID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "target_card_id or target_user_id required"})
		return
	}
	if req.TargetCardID != nil && req.TargetUserID != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only one of target_card_id or target_user_id allowed"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)
	sub := &domain.Subscription{
		ID:     uuid.New(),
		UserID: userID,
	}

	if req.TargetCardID != nil {
		cardID, err := uuid.Parse(*req.TargetCardID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target_card_id"})
			return
		}

		card, err := h.cards.FindByID(cardID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		if card == nil || !card.IsPublic {
			c.JSON(http.StatusForbidden, gin.H{"error": "card not found or not public"})
			return
		}

		// Check duplicate
		existing, _ := h.subs.FindByUserAndCard(userID, cardID)
		if existing != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "already subscribed"})
			return
		}

		sub.TargetCardID = &cardID
		if err := h.subs.Create(sub); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		_ = h.subs.IncrementSubscriberCount(cardID)
	} else {
		targetUserID, err := uuid.Parse(*req.TargetUserID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target_user_id"})
			return
		}
		if targetUserID == userID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot subscribe to yourself"})
			return
		}

		existing, _ := h.subs.FindByUserAndTargetUser(userID, targetUserID)
		if existing != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "already subscribed"})
			return
		}

		sub.TargetUserID = &targetUserID
		if err := h.subs.Create(sub); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
	}

	c.JSON(http.StatusCreated, subResponse(sub))
}

// DELETE /subscriptions/:id
func (h *SubscriptionHandler) Unsubscribe(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subscription id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	sub, err := h.subs.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if sub == nil || sub.UserID != userID {
		c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
		return
	}

	if err := h.subs.Delete(id, userID); err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	if sub.TargetCardID != nil {
		_ = h.subs.DecrementSubscriberCount(*sub.TargetCardID)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /me/subscriptions
func (h *SubscriptionHandler) ListMySubscriptions(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	subs, err := h.subs.FindByUser(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	cards := []gin.H{}
	users := []gin.H{}
	for i := range subs {
		s := &subs[i]
		if s.TargetCardID != nil {
			cards = append(cards, subResponse(s))
		} else {
			users = append(users, subResponse(s))
		}
	}

	c.JSON(http.StatusOK, gin.H{"cards": cards, "users": users})
}
