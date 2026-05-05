package handler

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/dmytro-demianov/geo-alert/internal/domain"
	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/pkg/storage"
)

type MarkerHandler struct {
	markers *repository.MarkerRepo
	cards   *repository.CardRepo
	storage *storage.Client
}

func NewMarkerHandler(markers *repository.MarkerRepo, cards *repository.CardRepo, storageClient *storage.Client) *MarkerHandler {
	return &MarkerHandler{markers: markers, cards: cards, storage: storageClient}
}

type createMarkerRequest struct {
	Title                string   `json:"title" binding:"required"`
	Description          string   `json:"description"`
	Latitude             float64  `json:"latitude" binding:"required"`
	Longitude            float64  `json:"longitude" binding:"required"`
	Images               []string `json:"images"`
	Tags                 []string `json:"tags"`
	AllowComments        *bool    `json:"allow_comments"`
	AllowLikes           *bool    `json:"allow_likes"`
	IsDraft              bool     `json:"is_draft"`
	NotificationsEnabled *bool    `json:"notifications_enabled"`
	NotificationType     string   `json:"notification_type"`
	ExpiresAt            *string  `json:"expires_at"`
	ExpirationType       string   `json:"expiration_type"`
}

type updateMarkerRequest struct {
	Title                string   `json:"title" binding:"required"`
	Description          string   `json:"description"`
	Images               []string `json:"images"`
	Tags                 []string `json:"tags"`
	AllowComments        *bool    `json:"allow_comments"`
	AllowLikes           *bool    `json:"allow_likes"`
	IsDraft              bool     `json:"is_draft"`
	NotificationsEnabled *bool    `json:"notifications_enabled"`
	NotificationType     string   `json:"notification_type"`
	ExpiresAt            *string  `json:"expires_at"`
	ExpirationType       string   `json:"expiration_type"`
}

func markerResponse(m *domain.Marker, callerID *uuid.UUID) gin.H {
	h := gin.H{
		"id":                    m.ID,
		"card_id":               m.CardID,
		"created_by":            m.CreatedBy,
		"title":                 m.Title,
		"description":           m.Description,
		"latitude":              m.Latitude,
		"longitude":             m.Longitude,
		"images":                m.Images,
		"tags":                  m.Tags,
		"like_weight":           m.LikeWeight,
		"comment_count":         m.CommentCount,
		"allow_comments":        m.AllowComments,
		"allow_likes":           m.AllowLikes,
		"is_draft":              m.IsDraft,
		"notifications_enabled": m.NotificationsEnabled,
		"notification_type":     m.NotificationType,
		"expires_at":            m.ExpiresAt,
		"expiration_type":       m.ExpirationType,
		"created_at":            m.CreatedAt,
		"updated_at":            m.UpdatedAt,
	}
	// view_count only visible to author
	if callerID != nil && *callerID == m.CreatedBy {
		h["view_count"] = m.ViewCount
	}
	return h
}

func parseNotificationType(s string) domain.NotificationType {
	switch s {
	case "ON_APPROACH":
		return domain.NotificationTypeOnApproach
	case "BOTH":
		return domain.NotificationTypeBoth
	default:
		return domain.NotificationTypeOnEnter
	}
}

func parseExpirationType(s string) domain.ExpirationType {
	switch s {
	case "UNTIL_TIME":
		return domain.ExpirationTypeUntilTime
	case "PERIOD":
		return domain.ExpirationTypePeriod
	case "END_OF_DAY":
		return domain.ExpirationTypeEndOfDay
	default:
		return domain.ExpirationTypeEternal
	}
}

func parseExpiresAt(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, *s)
	if err != nil {
		return nil
	}
	return &t
}

// POST /cards/:id/markers
func (h *MarkerHandler) CreateMarker(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	card, err := h.cards.FindByID(cardID)
	if err != nil || card == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)
	if card.OwnerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	var req createMarkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if utf8.RuneCountInString(req.Title) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title must not exceed 200 characters"})
		return
	}
	if len(req.Images) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "max 5 images"})
		return
	}
	if len(req.Tags) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "max 5 tags"})
		return
	}

	allowComments := true
	if req.AllowComments != nil {
		allowComments = *req.AllowComments
	}
	allowLikes := true
	if req.AllowLikes != nil {
		allowLikes = *req.AllowLikes
	}
	notifEnabled := true
	if req.NotificationsEnabled != nil {
		notifEnabled = *req.NotificationsEnabled
	}

	marker := &domain.Marker{
		ID:                   uuid.New(),
		CardID:               cardID,
		CreatedBy:            userID,
		Title:                req.Title,
		Description:          req.Description,
		Latitude:             req.Latitude,
		Longitude:            req.Longitude,
		Images:               req.Images,
		Tags:                 req.Tags,
		AllowComments:        allowComments,
		AllowLikes:           allowLikes,
		IsDraft:              req.IsDraft,
		NotificationsEnabled: notifEnabled,
		NotificationType:     parseNotificationType(req.NotificationType),
		ExpiresAt:            parseExpiresAt(req.ExpiresAt),
		ExpirationType:       parseExpirationType(req.ExpirationType),
	}

	if err := h.markers.Create(marker); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	if !marker.IsDraft {
		_ = h.markers.IncrementMarkerCount(cardID)
	}

	// Find nearby markers within 200m (best-effort)
	nearby := []gin.H{}
	nearbyList, _ := h.markers.FindNearby(cardID, req.Latitude, req.Longitude, 200)
	for i := range nearbyList {
		if nearbyList[i].ID != marker.ID {
			nearby = append(nearby, markerResponse(&nearbyList[i], &userID))
		}
	}

	resp := markerResponse(marker, &userID)
	resp["nearby_markers"] = nearby
	c.JSON(http.StatusCreated, resp)
}

// GET /cards/:id/markers
func (h *MarkerHandler) ListMarkers(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
		return
	}

	card, err := h.cards.FindByID(cardID)
	if err != nil || card == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	if !card.IsPublic {
		rawUserID, exists := c.Get("user_id")
		if !exists || rawUserID.(uuid.UUID) != card.OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	f := repository.MarkerFilter{
		Q:              c.Query("q"),
		Sort:           c.Query("sort"),
		IncludeExpired: c.Query("include_expired") == "true",
		Limit:          20,
	}

	if tags := c.Query("tags"); tags != "" {
		f.Tags = strings.Split(tags, ",")
	}
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

	// Show drafts only to owner
	rawUserID, authenticated := c.Get("user_id")
	if authenticated && rawUserID.(uuid.UUID) == card.OwnerID {
		f.IncludeDrafts = c.Query("include_drafts") == "true"
	}

	markers, err := h.markers.FindByCardID(cardID, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	var callerID *uuid.UUID
	if authenticated {
		id := rawUserID.(uuid.UUID)
		callerID = &id
	}

	result := make([]gin.H, 0, len(markers))
	for i := range markers {
		result = append(result, markerResponse(&markers[i], callerID))
	}

	var nextCursor *string
	if len(markers) == f.Limit && f.Sort != "popular" {
		last := markers[len(markers)-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &last
	}

	c.JSON(http.StatusOK, gin.H{"markers": result, "next_cursor": nextCursor})
}

// GET /markers/:id
func (h *MarkerHandler) GetMarker(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	marker, err := h.markers.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if marker == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "marker not found"})
		return
	}

	// Check card access
	card, err := h.cards.FindByID(marker.CardID)
	if err != nil || card == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return
	}

	rawUserID, authenticated := c.Get("user_id")
	var callerID *uuid.UUID
	if authenticated {
		id := rawUserID.(uuid.UUID)
		callerID = &id
	}

	if !card.IsPublic {
		if !authenticated || *callerID != card.OwnerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
	}

	c.JSON(http.StatusOK, markerResponse(marker, callerID))
}

// PUT /markers/:id
func (h *MarkerHandler) UpdateMarker(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	var req updateMarkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if utf8.RuneCountInString(req.Title) > 200 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title must not exceed 200 characters"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	marker, err := h.markers.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if marker == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "marker not found"})
		return
	}
	if marker.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	// Forbid updating expired marker
	if marker.ExpiresAt != nil && marker.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusConflict, gin.H{"error": "cannot update expired marker"})
		return
	}

	if len(req.Images) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "max 5 images"})
		return
	}

	marker.Title = req.Title
	marker.Description = req.Description
	marker.Images = req.Images
	marker.Tags = req.Tags
	if req.AllowComments != nil {
		marker.AllowComments = *req.AllowComments
	}
	if req.AllowLikes != nil {
		marker.AllowLikes = *req.AllowLikes
	}
	if req.NotificationsEnabled != nil {
		marker.NotificationsEnabled = *req.NotificationsEnabled
	}
	marker.IsDraft = req.IsDraft
	marker.NotificationType = parseNotificationType(req.NotificationType)
	marker.ExpiresAt = parseExpiresAt(req.ExpiresAt)
	marker.ExpirationType = parseExpirationType(req.ExpirationType)

	if err := h.markers.Update(marker); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	c.JSON(http.StatusOK, markerResponse(marker, &userID))
}

// DELETE /markers/:id
func (h *MarkerHandler) DeleteMarker(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	// Need card ID for decrement before deletion
	marker, err := h.markers.FindByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}
	if marker == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "marker not found"})
		return
	}
	if marker.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	}

	if err := h.markers.Delete(id, userID); err == gorm.ErrRecordNotFound {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	if !marker.IsDraft {
		_ = h.markers.DecrementMarkerCount(marker.CardID)
	}

	// Asynchronously delete associated photos from storage.
	if h.storage != nil && len(marker.Images) > 0 {
		go h.storage.DeletePhotos(context.Background(), marker.Images)
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
