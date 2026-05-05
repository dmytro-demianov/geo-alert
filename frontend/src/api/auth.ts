import { apiClient } from './client'
import type { AuthResponse } from './types'

export async function exchangeCodeForTokens(code: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/google', { code })
  return data
}

export async function fetchMe(): Promise<AuthResponse['user']> {
  const { data } = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me')
  return data.user
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout')
}

export function buildGoogleOAuthUrl(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
