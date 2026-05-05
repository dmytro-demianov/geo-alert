import { useAuthStore } from '@/store/auth'

type WSMessageHandler = (data: unknown) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, Set<WSMessageHandler>>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private readonly maxDelay = 30_000

  connect() {
    const token = useAuthStore.getState().accessToken
    if (!token) return

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url = `${protocol}://${window.location.host}/api/ws?token=${token}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string } & Record<string, unknown>
        this.handlers.get(msg.type)?.forEach((cb) => cb(msg))
      } catch {
        // ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  on(type: string, handler: WSMessageHandler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler)
  }

  off(type: string, handler: WSMessageHandler) {
    this.handlers.get(type)?.delete(handler)
  }

  private scheduleReconnect() {
    if (!useAuthStore.getState().isAuthenticated) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay)
      this.connect()
    }, this.reconnectDelay)
  }
}

export const wsClient = new WebSocketClient()
