package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/dmytro-demianov/geo-alert/internal/repository"
)

// BlockCheck aborts with 403 if the authenticated user is globally blocked by the resource owner.
// It looks for owner_id in the gin context (set by upstream handlers) and checks USER_BLOCK.
func BlockCheck(blocks *repository.BlockRepo) gin.HandlerFunc {
	return func(c *gin.Context) {
		callerVal, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}
		callerID := callerVal.(uuid.UUID)

		ownerVal, exists := c.Get("owner_id")
		if !exists {
			c.Next()
			return
		}
		ownerID := ownerVal.(uuid.UUID)

		// Check if owner blocked the caller
		blocked, err := blocks.IsBlocked(ownerID, callerID)
		if err == nil && blocked {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked"})
			return
		}

		c.Next()
	}
}
