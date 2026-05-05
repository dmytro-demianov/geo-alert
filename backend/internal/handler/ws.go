package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	internalws "github.com/dmytro-demianov/geo-alert/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Origin validation handled at reverse-proxy level in production.
		return true
	},
}

type WSHandler struct {
	manager *internalws.Manager
}

func NewWSHandler(manager *internalws.Manager) *WSHandler {
	return &WSHandler{manager: manager}
}

// GET /ws/stats — текущее количество подключений (только в non-production)
func (h *WSHandler) Stats(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"connections":      h.manager.ConnectedCount(),
		"connected_users":  h.manager.ConnectedUsers(),
	})
}

// GET /ws  (requires AuthRequired middleware — user_id must be in context)
func (h *WSHandler) ServeWS(c *gin.Context) {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		// upgrader already wrote the error response
		return
	}

	client := internalws.NewClient(userID.(uuid.UUID))
	client.SetConn(conn)

	h.manager.RunClient(client)
}
