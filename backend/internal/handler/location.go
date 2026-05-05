package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
	"github.com/dmytro-demianov/geo-alert/internal/service"
)

type LocationHandler struct {
	location      *repository.LocationRepo
	users         *repository.UserRepo
	notifications *service.NotificationService
}

func NewLocationHandler(
	location *repository.LocationRepo,
	users *repository.UserRepo,
	notifications *service.NotificationService,
) *LocationHandler {
	return &LocationHandler{
		location:      location,
		users:         users,
		notifications: notifications,
	}
}

type updateLocationRequest struct {
	Lat      float64 `json:"lat" binding:"required"`
	Lon      float64 `json:"lon" binding:"required"`
	Accuracy float64 `json:"accuracy"`
}

// POST /users/me/location
func (h *LocationHandler) UpdateLocation(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	var req updateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lowAccuracy := req.Accuracy > 100

	nearby, err := h.location.FindNearbyForUser(userID, req.Lat, req.Lon)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Send FCM push if the user has a token and there are nearby markers.
	if len(nearby) > 0 && h.notifications != nil {
		user, userErr := h.users.FindByID(userID)
		if userErr == nil && user != nil && user.FCMToken != "" {
			go h.notifications.SendNearbyPush(c.Request.Context(), userID, user.FCMToken, nearby)
		}
	}

	items := make([]gin.H, 0, len(nearby))
	for _, m := range nearby {
		items = append(items, gin.H{
			"id":              m.ID,
			"title":           m.Title,
			"lat":             m.Latitude,
			"lon":             m.Longitude,
			"radius":          m.Radius,
			"like_weight":     m.LikeWeight,
			"card_id":         m.CardID,
			"distance_meters": m.DistanceMeters,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"low_accuracy":   lowAccuracy,
		"nearby_markers": items,
	})
}

// GET /feed/nearby?lat=&lon=&radius=&limit=&cursor=
func (h *LocationHandler) GetNearbyFeed(c *gin.Context) {
	latStr := c.Query("lat")
	lonStr := c.Query("lon")

	if latStr == "" || lonStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "lat and lon are required"})
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lat"})
		return
	}
	lon, err := strconv.ParseFloat(lonStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid lon"})
		return
	}

	radius := 500.0
	if rStr := c.Query("radius"); rStr != "" {
		if r, err := strconv.ParseFloat(rStr, 64); err == nil && r > 0 {
			if r > 5000 {
				r = 5000
			}
			radius = r
		}
	}

	limit := 20
	if lStr := c.Query("limit"); lStr != "" {
		if l, err := strconv.Atoi(lStr); err == nil && l > 0 {
			if l > 100 {
				l = 100
			}
			limit = l
		}
	}

	var beforeID *uuid.UUID
	if cursorStr := c.Query("cursor"); cursorStr != "" {
		if id, err := uuid.Parse(cursorStr); err == nil {
			beforeID = &id
		}
	}

	var callerID *uuid.UUID
	if rawUserID, exists := c.Get("user_id"); exists {
		id := rawUserID.(uuid.UUID)
		callerID = &id
	}

	markers, err := h.location.FindNearbyPublic(lat, lon, radius, limit, beforeID, callerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	items := make([]gin.H, 0, len(markers))
	for _, m := range markers {
		items = append(items, gin.H{
			"id":              m.ID,
			"title":           m.Title,
			"lat":             m.Latitude,
			"lon":             m.Longitude,
			"radius":          m.Radius,
			"like_weight":     m.LikeWeight,
			"card_id":         m.CardID,
			"distance_meters": m.DistanceMeters,
		})
	}

	var nextCursor *string
	if len(markers) == limit {
		last := markers[len(markers)-1]
		s := last.ID.String()
		nextCursor = &s
	}

	c.JSON(http.StatusOK, gin.H{
		"markers":     items,
		"next_cursor": nextCursor,
	})
}
