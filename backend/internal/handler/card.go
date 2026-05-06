package handler

import (
	"net/http"
	"strconv"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type CardHandler struct {
	cards  cardStore
	blocks *repository.BlockRepo
}

func NewCardHandler(cards *repository.CardRepo, blocks *repository.BlockRepo) *CardHandler {
	return &CardHandler{cards: cards, blocks: blocks}
}

type createCardRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	IsPublic    *bool  `json:"is_public"`
	TTLHours    int    `json:"ttl_hours"`
}

type updateCardRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	IsPublic    *bool  `json:"is_public"`
	TTLHours    int    `json:"ttl_hours"`
}

func cardResponse(c *domain.Card) gin.H {
	return gin.H{
		"id":          c.ID,
		"owner_id":    c.OwnerID,
		"title":       c.Title,
		"description": c.Description,
		"is_public":   c.IsPublic,
		"ttl_hours":   c.TTLHours,
		"view_count":  c.ViewCount,
		"created_at":  c.CreatedAt,
		"updated_at":  c.UpdatedAt,
	}
}

func parsePagination(c *gin.Context) (limit, offset int) {
	limit = 20
	offset = 0

	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			if v > 100 {
				v = 100
			}
			limit = v
		}
	}
	if o := c.Query("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}
	return limit, offset
}

// POST /cards (AuthRequired)
func (h *CardHandler) CreateCard(c *gin.Context) {
	var req createCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if utf8.RuneCountInString(req.Title) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title must not exceed 200 characters"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	isPublic := true
	if req.IsPublic != nil {
		isPublic = *req.IsPublic
	}

	card := &domain.Card{
		ID:          uuid.New(),
		OwnerID:     userID,
		Title:       req.Title,
		Description: req.Description,
		IsPublic:    isPublic,
		TTLHours:    req.TTLHours,
	}

	if err := h.cards.Create(card); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusCreated, cardResponse(card))
}

// GET /cards — список публичных карт
func (h *CardHandler) ListPublic(c *gin.Context) {
	limit, offset := parsePagination(c)

	cards, err := h.cards.FindPublic(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	result := make([]gin.H, 0, len(cards))
	for i := range cards {
		result = append(result, cardResponse(&cards[i]))
	}
	c.JSON(http.StatusOK, gin.H{"cards": result, "limit": limit, "offset": offset})
}

// GET /cards/:id
func (h *CardHandler) GetCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	card, err := h.cards.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if card == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	// If private — only owner can view
	rawUserID, callerExists := c.Get("user_id")
	var callerID uuid.UUID
	if callerExists {
		callerID = rawUserID.(uuid.UUID)
	}

	if !card.IsPublic {
		if !callerExists || callerID != card.OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	// Block check: owner may have blocked caller
	if callerExists && callerID != card.OwnerID {
		if blocked, err := h.blocks.IsBlocked(card.OwnerID, callerID); err == nil && blocked {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	// Increment view count (best-effort, ignore error)
	_ = h.cards.IncrementViewCount(id)
	card.ViewCount++

	c.JSON(http.StatusOK, cardResponse(card))
}

// GET /users/:id/cards
func (h *CardHandler) ListByOwner(c *gin.Context) {
	ownerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	limit, offset := parsePagination(c)

	cards, err := h.cards.FindByOwnerID(ownerID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Determine calling user (optional auth)
	rawUserID, callerAuthenticated := c.Get("user_id")
	var callerID uuid.UUID
	if callerAuthenticated {
		callerID = rawUserID.(uuid.UUID)
	}

	result := make([]gin.H, 0, len(cards))
	for i := range cards {
		card := &cards[i]
		// Skip private cards unless it's the owner
		if !card.IsPublic && (!callerAuthenticated || callerID != ownerID) {
			continue
		}
		result = append(result, cardResponse(card))
	}

	c.JSON(http.StatusOK, gin.H{"cards": result, "limit": limit, "offset": offset})
}

// PUT /cards/:id (AuthRequired)
func (h *CardHandler) UpdateCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	var req updateCardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if utf8.RuneCountInString(req.Title) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title must not exceed 200 characters"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	card, err := h.cards.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if card == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}
	if card.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	card.Title = req.Title
	card.Description = req.Description
	if req.IsPublic != nil {
		card.IsPublic = *req.IsPublic
	}
	card.TTLHours = req.TTLHours

	if err := h.cards.Update(card); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, cardResponse(card))
}

// DELETE /cards/:id (AuthRequired)
func (h *CardHandler) DeleteCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	err = h.cards.Delete(id, userID)
	if err == gorm.ErrRecordNotFound {
		// Either not found or not owner — return 403 to avoid leaking existence
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
