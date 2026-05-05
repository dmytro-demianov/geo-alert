import { apiClient } from './client'
import type { Card } from './cards'

export interface UserProfile {
  id: string
  display_name: string
  avatar_url: string | null
  bio?: string
  is_private: boolean
  card_count?: number
  subscriber_count?: number
  created_at: string
}

export interface Subscription {
  id: string
  card_id: string
  user_id: string
  created_at: string
  card?: Card
}

export interface BlockedItem {
  id: string
  type: 'user' | 'card'
  target_id: string
  display_name?: string
  avatar_url?: string | null
  title?: string
  created_at: string
}

export interface BlockedListResponse {
  blocked_users: BlockedItem[]
  blocked_cards: BlockedItem[]
}

export interface SubscriptionsResponse {
  subscriptions: Subscription[]
}

export const usersApi = {
  getProfile: (userId: string) =>
    apiClient.get<UserProfile>(`/users/${userId}`),

  updateMe: (payload: Partial<Pick<UserProfile, 'display_name' | 'bio'>>) =>
    apiClient.put<UserProfile>('/users/me', payload),

  deleteMe: () =>
    apiClient.delete('/users/me'),

  getUserCards: (userId: string, limit = 20, offset = 0) =>
    apiClient.get<{ cards: Card[] }>(`/users/${userId}/cards`, { params: { limit, offset } }),

  blockUser: (userId: string) =>
    apiClient.post(`/users/${userId}/block`),

  unblockUser: (userId: string) =>
    apiClient.delete(`/users/${userId}/block`),

  blockCard: (cardId: string) =>
    apiClient.post(`/cards/${cardId}/block`),

  unblockCard: (cardId: string) =>
    apiClient.delete(`/cards/${cardId}/block`),

  getBlocked: () =>
    apiClient.get<BlockedListResponse>('/me/blocked'),
}

export const subscriptionsApi = {
  subscribe: (cardId: string) =>
    apiClient.post<Subscription>('/subscriptions', { card_id: cardId }),

  unsubscribe: (subscriptionId: string) =>
    apiClient.delete(`/subscriptions/${subscriptionId}`),

  getMySubscriptions: () =>
    apiClient.get<SubscriptionsResponse>('/me/subscriptions'),
}
