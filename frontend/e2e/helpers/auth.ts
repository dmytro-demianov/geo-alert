import { Page } from '@playwright/test'

/**
 * Mock auth state in localStorage so tests skip the real OAuth flow.
 * Zustand persist key is "geo-alert-auth".
 */
export const MOCK_USER = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  display_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
}

export const MOCK_TOKEN = 'mock-jwt-access-token'
export const MOCK_REFRESH_TOKEN = 'mock-jwt-refresh-token'

export async function setupAuth(page: Page) {
  await page.addInitScript(({ user, accessToken, refreshToken }) => {
    const authState = {
      state: {
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      },
      version: 0,
    }
    localStorage.setItem('geo-alert-auth', JSON.stringify(authState))
  }, { user: MOCK_USER, accessToken: MOCK_TOKEN, refreshToken: MOCK_REFRESH_TOKEN })
}
