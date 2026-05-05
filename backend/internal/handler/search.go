package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

type SearchHandler struct {
	search *repository.SearchRepo
}

func NewSearchHandler(search *repository.SearchRepo) *SearchHandler {
	return &SearchHandler{search: search}
}

// GET /search?type=markers|cards|users&q=...&tags=a,b&limit=20&offset=0
func (h *SearchHandler) Search(c *gin.Context) {
	searchType := c.Query("type")
	q := strings.TrimSpace(c.Query("q"))

	limit := 20
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	offset := 0
	if o, err := strconv.Atoi(c.Query("offset")); err == nil && o >= 0 {
		offset = o
	}

	switch searchType {
	case "markers":
		var tags []string
		if t := c.Query("tags"); t != "" {
			for _, tag := range strings.Split(t, ",") {
				if tag = strings.TrimSpace(tag); tag != "" {
					tags = append(tags, tag)
				}
			}
		}
		results, err := h.search.SearchMarkers(q, tags, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		items := make([]gin.H, 0, len(results))
		for i := range results {
			m := &results[i]
			items = append(items, gin.H{
				"id":            m.ID,
				"card_id":       m.CardID,
				"card_title":    m.CardTitle,
				"created_by":    m.CreatedBy,
				"title":         m.Title,
				"description":   m.Description,
				"latitude":      m.Latitude,
				"longitude":     m.Longitude,
				"tags":          m.Tags,
				"like_weight":   m.LikeWeight,
				"comment_count": m.CommentCount,
				"view_count":    m.ViewCount,
				"expires_at":    m.ExpiresAt,
				"created_at":    m.CreatedAt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"type": "markers", "items": items, "total": len(items)})

	case "cards":
		cards, err := h.search.SearchCards(q, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		items := make([]gin.H, 0, len(cards))
		for i := range cards {
			cd := &cards[i]
			items = append(items, gin.H{
				"id":               cd.ID,
				"owner_id":         cd.OwnerID,
				"title":            cd.Title,
				"description":      cd.Description,
				"marker_count":     cd.MarkerCount,
				"subscriber_count": cd.SubscriberCount,
				"created_at":       cd.CreatedAt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"type": "cards", "items": items, "total": len(items)})

	case "users":
		users, err := h.search.SearchUsers(q, limit, offset)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
			return
		}
		items := make([]gin.H, 0, len(users))
		for i := range users {
			u := &users[i]
			items = append(items, gin.H{
				"id":           u.ID,
				"display_name": u.DisplayName,
				"avatar_url":   u.AvatarURL,
				"bio":          u.Bio,
				"is_private":   u.IsPrivate,
			})
		}
		c.JSON(http.StatusOK, gin.H{"type": "users", "items": items, "total": len(items)})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "type must be one of: markers, cards, users"})
	}
}
