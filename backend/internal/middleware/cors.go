package middleware

import (
	"net/http"
	"slices"
	"time"

	"github.com/gin-gonic/gin"
)

// CORS returns a middleware that sets CORS headers for the given list of allowed origins.
// OPTIONS preflight requests are handled and short-circuited with 204.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	maxAge := int(12 * time.Hour / time.Second)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
			c.Header("Access-Control-Max-Age", itoa(maxAge))
			c.Header("Vary", "Origin")
		}

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
