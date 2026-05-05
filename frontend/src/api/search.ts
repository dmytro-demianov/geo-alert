import { apiClient } from './client'

export interface SearchMarker {
  id: string
  card_id: string
  title: string
  description: string
  latitude: number
  longitude: number
  tags: string[]
  like_weight: number
  comment_count: number
  created_at: string
}

export interface SearchCard {
  id: string
  owner_id: string
  title: string
  description: string
  marker_count: number
  subscriber_count: number
  created_at: string
}

export interface SearchUser {
  id: string
  display_name: string
  avatar_url: string
  bio: string
  is_private: boolean
}

export type SearchType = 'markers' | 'cards' | 'users'

export interface SearchResponse<T> {
  type: SearchType
  items: T[]
  total: number
}

export const searchApi = {
  searchMarkers: (q: string, tags: string[], limit = 20, offset = 0) =>
    apiClient.get<SearchResponse<SearchMarker>>('/search', {
      params: {
        type: 'markers',
        q,
        tags: tags.join(',') || undefined,
        limit,
        offset,
      },
    }),
  searchCards: (q: string, limit = 20, offset = 0) =>
    apiClient.get<SearchResponse<SearchCard>>('/search', {
      params: { type: 'cards', q, limit, offset },
    }),
  searchUsers: (q: string, limit = 20, offset = 0) =>
    apiClient.get<SearchResponse<SearchUser>>('/search', {
      params: { type: 'users', q, limit, offset },
    }),
}
