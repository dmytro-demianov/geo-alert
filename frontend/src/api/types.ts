export interface ApiUser {
  id: string
  email: string
  display_name: string
  avatar_url: string
  bio?: string
  is_private: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: Pick<ApiUser, 'id' | 'email' | 'display_name' | 'avatar_url'>
}

export interface ApiError {
  error: string
}
