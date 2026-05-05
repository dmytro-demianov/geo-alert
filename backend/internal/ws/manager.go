package ws

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = 45 * time.Second
	maxMsgSize = 4096
)

// Client represents a single WebSocket connection.
type Client struct {
	UserID uuid.UUID
	conn   *websocket.Conn
	send   chan []byte
}

func NewClient(userID uuid.UUID) *Client {
	return &Client{
		UserID: userID,
		send:   make(chan []byte, 256),
	}
}

func (c *Client) SetConn(conn *websocket.Conn) {
	c.conn = conn
}

// Manager keeps track of all active WebSocket connections.
type Manager struct {
	mu      sync.RWMutex
	clients map[uuid.UUID][]*Client
}

func NewManager() *Manager {
	return &Manager{
		clients: make(map[uuid.UUID][]*Client),
	}
}

func (m *Manager) Register(c *Client) {
	m.mu.Lock()
	m.clients[c.UserID] = append(m.clients[c.UserID], c)
	m.mu.Unlock()
	log.Debug().Stringer("user_id", c.UserID).Msg("ws: client registered")
}

func (m *Manager) Unregister(c *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()
	conns := m.clients[c.UserID]
	for i, cc := range conns {
		if cc == c {
			m.clients[c.UserID] = append(conns[:i], conns[i+1:]...)
			break
		}
	}
	if len(m.clients[c.UserID]) == 0 {
		delete(m.clients, c.UserID)
	}
	close(c.send)
	log.Debug().Stringer("user_id", c.UserID).Msg("ws: client unregistered")
}

// SendToUser enqueues a message for all connections of a given user (non-blocking).
func (m *Manager) SendToUser(userID uuid.UUID, msg []byte) {
	m.mu.RLock()
	conns := m.clients[userID]
	m.mu.RUnlock()
	for _, c := range conns {
		select {
		case c.send <- msg:
		default:
			log.Warn().Stringer("user_id", userID).Msg("ws: send buffer full, dropping message")
		}
	}
}

// ConnectedCount returns the number of currently connected clients.
func (m *Manager) ConnectedCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	total := 0
	for _, conns := range m.clients {
		total += len(conns)
	}
	return total
}

// ConnectedUsers returns the number of unique users connected.
func (m *Manager) ConnectedUsers() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.clients)
}

// Broadcast sends a message to all connected clients.
func (m *Manager) Broadcast(msg []byte) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, conns := range m.clients {
		for _, c := range conns {
			select {
			case c.send <- msg:
			default:
			}
		}
	}
}

// RunClient starts the read and write pumps for a client. Blocks until disconnected.
func (m *Manager) RunClient(c *Client) {
	m.Register(c)
	go c.writePump()
	c.readPump(m)
}

// readPump reads messages from the WebSocket. Exits on error or close.
func (c *Client) readPump(m *Manager) {
	defer m.Unregister(c)
	c.conn.SetReadLimit(maxMsgSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Debug().Err(err).Stringer("user_id", c.UserID).Msg("ws: read error")
			}
			break
		}
		// Clients are read-only; server-to-client only.
	}
}

// writePump sends messages from the send channel and periodic pings.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
