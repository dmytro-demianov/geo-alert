import { apiClient } from './client'

export interface Card {
  id: string
  owner_id: string
  title: string
  description: string
  is_public: boolean
  ttl_hours: number
  view_count: number
  created_at: string
  updated_at: string
}

export interface CreateCardPayload {
  title: string
  description?: string
  is_public: boolean
  ttl_hours?: number
}

export interface UpdateCardPayload {
  title: string
  description?: string
  is_public: boolean
  ttl_hours?: number
}

export interface CardsListResponse {
  cards: Card[]
  limit: number
  offset: number
}

export const cardsApi = {
  listPublic: (limit = 20, offset = 0) =>
    apiClient.get<CardsListResponse>('/cards', { params: { limit, offset } }),

  listByOwner: (userId: string, limit = 20, offset = 0) =>
    apiClient.get<CardsListResponse>(`/users/${userId}/cards`, { params: { limit, offset } }),

  getById: (id: string) =>
    apiClient.get<Card>(`/cards/${id}`),

  create: (payload: CreateCardPayload) =>
    apiClient.post<Card>('/cards', payload),

  update: (id: string, payload: UpdateCardPayload) =>
    apiClient.put<Card>(`/cards/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/cards/${id}`),
}
