import { apiClient } from './client'

export type NotificationType = 'ON_ENTER' | 'ON_APPROACH' | 'BOTH'
export type ExpirationType = 'ETERNAL' | 'UNTIL_TIME' | 'PERIOD' | 'END_OF_DAY'

export interface MarkerData {
  id: string
  card_id: string
  created_by: string
  title: string
  description: string
  latitude: number
  longitude: number
  images: string[]
  tags: string[]
  like_weight: number
  comment_count: number
  allow_comments: boolean
  allow_likes: boolean
  is_draft: boolean
  notification_type: NotificationType
  expires_at: string | null
  expiration_type: ExpirationType
  created_at: string
  updated_at: string
  nearby_markers?: MarkerData[]
}

export interface CreateMarkerPayload {
  title: string
  description?: string
  latitude: number
  longitude: number
  images?: string[]
  tags?: string[]
  allow_comments?: boolean
  allow_likes?: boolean
  is_draft?: boolean
  notifications_enabled?: boolean
  notification_type?: NotificationType
  expires_at?: string
  expiration_type?: ExpirationType
}

export interface MarkersListResponse {
  markers: MarkerData[]
  cursor?: string
  has_more?: boolean
}

export const markersApi = {
  list: (cardId: string, limit = 50) =>
    apiClient.get<MarkersListResponse>(`/cards/${cardId}/markers`, {
      params: { limit },
    }),

  create: (cardId: string, payload: CreateMarkerPayload) =>
    apiClient.post<MarkerData>(`/cards/${cardId}/markers`, payload),

  getById: (markerId: string) =>
    apiClient.get<MarkerData>(`/markers/${markerId}`),

  getMarker: (markerId: string) =>
    apiClient.get<MarkerData>(`/markers/${markerId}`),

  update: (markerId: string, payload: Partial<CreateMarkerPayload>) =>
    apiClient.put<MarkerData>(`/markers/${markerId}`, payload),

  delete: (markerId: string) =>
    apiClient.delete(`/markers/${markerId}`),
}
