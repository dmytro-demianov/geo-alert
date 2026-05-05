import { apiClient } from './client'

export interface AppNotification {
  id: string
  type: string
  related_marker_id: string | null
  related_card_id: string | null
  related_user_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export interface NotificationsResponse {
  notifications: AppNotification[]
  has_more: boolean
}

export const notificationsApi = {
  getNotifications: (limit = 20, before?: string) =>
    apiClient.get<NotificationsResponse>('/notifications', {
      params: { limit, before },
    }),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    apiClient.put(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.put('/notifications/read-all'),
}
