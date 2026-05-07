import { apiClient } from './client'

export type NotificationType = 'ON_ENTER' | 'ON_APPROACH' | 'BOTH'
export type ExpirationType = 'ETERNAL' | 'UNTIL_TIME' | 'PERIOD' | 'END_OF_DAY'
export type LikeType = 'LIKE' | 'DISLIKE'
export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'misinformation'
  | 'copyright'
  | 'other'

export interface Comment {
  id: string
  marker_id: string
  created_by: string
  author_name: string
  author_avatar?: string
  content: string
  created_at: string
  deleted_at?: string | null
}

export interface CommentsResponse {
  comments: Comment[]
  cursor?: string
  has_more?: boolean
}

export interface LikeResponse {
  type: LikeType | null
  like_weight: number
}

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
  view_count?: number
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

  toggleLike: (markerId: string, type: LikeType) =>
    apiClient.post<LikeResponse>(`/markers/${markerId}/likes`, { type }),

  getComments: (markerId: string, cursor?: string, limit = 20) =>
    apiClient.get<CommentsResponse>(`/markers/${markerId}/comments`, {
      params: { cursor, limit },
    }),

  createComment: (markerId: string, content: string) =>
    apiClient.post<Comment>(`/markers/${markerId}/comments`, { content }),

  deleteComment: (commentId: string) =>
    apiClient.delete(`/comments/${commentId}`),

  reportMarker: (markerId: string, reason: ReportReason, comment?: string) =>
    apiClient.post(`/markers/${markerId}/reports`, { reason, comment }),

  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return apiClient.post<{ url: string }>('/upload/photo', form)
  },
}
