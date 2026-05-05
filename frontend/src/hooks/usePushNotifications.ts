import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { wsClient } from '@/ws/client'
import { showToast } from '@/components/Toast'
import { apiClient } from '@/api/client'

async function registerSW() {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    // ignore in dev
  }
}

async function requestPushPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') return
  if (Notification.permission === 'denied') return
  await Notification.requestPermission()
}

async function subscribePush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) return

    // VAPID public key would go here in production
    // For now, just register the SW without push subscription
    void userId
  } catch {
    // ignore
  }
}

export function usePushNotifications() {
  const { isAuthenticated, user } = useAuthStore()

  // Register SW and request push permission
  useEffect(() => {
    registerSW()
    if (isAuthenticated) {
      requestPushPermission().then(() => {
        if (user?.id) subscribePush(user.id)
      })
    }
  }, [isAuthenticated, user?.id])

  // FCM token registration when permission granted
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return

    const sendFCMToken = async (token: string) => {
      try {
        await apiClient.post('/users/me/fcm-token', { token })
      } catch {
        // ignore
      }
    }

    // Placeholder - in production this would use Firebase Messaging SDK
    // to get the actual FCM token and send it here
    void sendFCMToken
  }, [isAuthenticated, user?.id])

  // Toast on WS new_notification
  useEffect(() => {
    if (!isAuthenticated) return

    const handler = (msg: unknown) => {
      const data = msg as { notification?: { message?: string } }
      if (data.notification?.message) {
        showToast(data.notification.message, 'info')
      }
    }

    wsClient.on('new_notification', handler)
    return () => wsClient.off('new_notification', handler)
  }, [isAuthenticated])
}
