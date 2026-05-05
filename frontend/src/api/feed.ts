import { apiClient } from './client'

export interface FeedMarker {
  id: string
  title: string
  description: string
  tags: string[]
  like_weight: number
  comment_count: number
  view_count: number
  photo_urls: string[]
  created_at: string
  card_id: string
}

export interface FeedCard {
  id: string
  title: string
  is_public: boolean
}

export interface FeedActor {
  id: string
  display_name: string
  avatar_url: string
}

export interface FeedItem {
  id: string
  type: 'new_marker' | string
  marker: FeedMarker
  card: FeedCard
  actor: FeedActor
  created_at: string
}

export interface FeedResponse {
  items: FeedItem[]
  next_cursor: string | null
  next_before_id: string | null
}

export interface GetFeedParams {
  limit?: number
  before?: string | null
  before_id?: string | null
}

export const feedApi = {
  getFeed: (params: GetFeedParams = {}) => {
    const query: Record<string, string | number> = {}
    if (params.limit != null) query.limit = params.limit
    if (params.before) query.before = params.before
    if (params.before_id) query.before_id = params.before_id
    return apiClient.get<FeedResponse>('/feed', { params: query })
  },
}
