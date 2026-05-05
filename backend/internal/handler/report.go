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

type ReportHandler struct {
	reports   *repository.ReportRepo
	markers   *repository.MarkerRepo
	notifRepo *repository.NotificationRepo
	wsHub     *ws.Manager
}

func NewReportHandler(
	reports *repository.ReportRepo,
	markers *repository.MarkerRepo,
	notifRepo *repository.NotificationRepo,
	wsHub *ws.Manager,
) *ReportHandler {
	return &ReportHandler{reports: reports, markers: markers, notifRepo: notifRepo, wsHub: wsHub}
}

type reportRequest struct {
	Reason  string `json:"reason" binding:"required"`
	Comment string `json:"comment"`
}

// POST /markers/:id/reports
func (h *ReportHandler) CreateReport(c *gin.Context) {
	markerID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid marker id"})
		return
	}

	var req reportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validReasons := map[string]bool{
		"spam": true, "inappropriate": true, "misinformation": true,
		"copyright": true, "other": true,
	}
	if !validReasons[req.Reason] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid reason"})
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

	userID := c.MustGet("user_id").(uuid.UUID)
	if marker.CreatedBy == userID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot report your own marker"})
		return
	}

	report := &domain.Report{
		ID:         uuid.New(),
		ReporterID: userID,
		MarkerID:   markerID,
		Reason:     req.Reason,
		Comment:    req.Comment,
	}

	if err := h.reports.Create(report); err != nil {
		if err == repository.ErrAlreadyReported {
			c.JSON(http.StatusConflict, gin.H{"error": "already reported"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Notify card owner
	notif := &domain.Notification{
		ID:              uuid.New(),
		UserID:          marker.CreatedBy,
		Type:            domain.NotifReportReceived,
		RelatedMarkerID: &marker.ID,
		Message:         "На вашу мітку надійшла скарга",
	}
	if err := h.notifRepo.Create(notif); err == nil {
		if msg, err := json.Marshal(map[string]any{
			"type":         "new_notification",
			"notification": notif,
		}); err == nil {
			h.wsHub.SendToUser(notif.UserID, msg)
		}
	}

	c.JSON(http.StatusCreated, gin.H{"ok": true})
}
