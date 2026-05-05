package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type BlockHandler struct {
	blocks *repository.BlockRepo
	cards  *repository.CardRepo
	subs   *repository.SubscriptionRepo
}

func NewBlockHandler(blocks *repository.BlockRepo, cards *repository.CardRepo, subs *repository.SubscriptionRepo) *BlockHandler {
	return &BlockHandler{blocks: blocks, cards: cards, subs: subs}
}

func blockResponse(b *domain.Block) gin.H {
	return gin.H{
		"id":             b.ID,
		"blocker_id":     b.BlockerID,
		"blocked_user_id": b.BlockedUserID,
		"block_type":     b.BlockType,
		"target_card_id": b.TargetCardID,
		"created_at":     b.CreatedAt,
	}
}

// POST /users/:id/block
func (h *BlockHandler) BlockUser(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	blockerID := c.MustGet("user_id").(uuid.UUID)
	if blockerID == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot block yourself"})
		return
	}

	existing, err := h.blocks.FindByBlockerAndUser(blockerID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already blocked"})
		return
	}

	b := &domain.Block{
		ID:            uuid.New(),
		BlockerID:     blockerID,
		BlockedUserID: targetID,
		BlockType:     domain.BlockTypeUser,
	}
	if err := h.blocks.Create(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Remove any subscriptions between the two users
	if sub, _ := h.subs.FindByUserAndTargetUser(blockerID, targetID); sub != nil {
		_ = h.subs.Delete(sub.ID, blockerID)
	}
	if sub, _ := h.subs.FindByUserAndTargetUser(targetID, blockerID); sub != nil {
		_ = h.subs.Delete(sub.ID, targetID)
	}

	c.JSON(http.StatusCreated, blockResponse(b))
}

// POST /cards/:id/block  body: { "blocked_user_id": "..." }
func (h *BlockHandler) BlockUserOnCard(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	var req struct {
		BlockedUserID string `json:"blocked_user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	blockedID, err := uuid.Parse(req.BlockedUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid blocked_user_id"})
		return
	}

	blockerID := c.MustGet("user_id").(uuid.UUID)

	card, err := h.cards.FindByID(cardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if card == nil || card.OwnerID != blockerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your card"})
		return
	}

	existing, _ := h.blocks.FindByBlockerAndCard(blockerID, blockedID, cardID)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already blocked on this card"})
		return
	}

	b := &domain.Block{
		ID:            uuid.New(),
		BlockerID:     blockerID,
		BlockedUserID: blockedID,
		BlockType:     domain.BlockTypeCard,
		TargetCardID:  &cardID,
	}
	if err := h.blocks.Create(b); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Remove subscription of blocked user from this card
	if sub, _ := h.subs.FindByUserAndCard(blockedID, cardID); sub != nil {
		_ = h.subs.Delete(sub.ID, blockedID)
		_ = h.subs.DecrementSubscriberCount(cardID)
	}

	c.JSON(http.StatusCreated, blockResponse(b))
}

// DELETE /users/:id/block
func (h *BlockHandler) UnblockUser(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	blockerID := c.MustGet("user_id").(uuid.UUID)

	b, err := h.blocks.FindByBlockerAndUser(blockerID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if b == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "block not found"})
		return
	}

	if err := h.blocks.Delete(b.ID, blockerID); err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "block not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// DELETE /cards/:id/block  query: ?blocked_user_id=
func (h *BlockHandler) UnblockUserOnCard(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	blockerID := c.MustGet("user_id").(uuid.UUID)

	card, err := h.cards.FindByID(cardID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if card == nil || card.OwnerID != blockerID {
		c.JSON(http.StatusForbidden, gin.H{"error": "not your card"})
		return
	}

	if err := h.blocks.DeleteByBlockerAndCard(blockerID, cardID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// GET /me/blocked
func (h *BlockHandler) ListBlocked(c *gin.Context) {
	blockerID := c.MustGet("user_id").(uuid.UUID)

	blocks, err := h.blocks.FindByBlocker(blockerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	result := make([]gin.H, 0, len(blocks))
	for i := range blocks {
		result = append(result, blockResponse(&blocks[i]))
	}
	c.JSON(http.StatusOK, gin.H{"blocks": result})
}
