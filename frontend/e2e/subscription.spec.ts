import { test, expect } from '@playwright/test'
import { setupAuth, MOCK_USER } from './helpers/auth'

const TARGET_USER_ID = 'other-user-id-456'

const TARGET_PROFILE = {
  id: TARGET_USER_ID,
  display_name: 'Другой пользователь',
  avatar_url: null,
  bio: 'Тестовый профиль',
  is_private: false,
  card_count: 1,
  subscriber_count: 5,
  created_at: new Date().toISOString(),
}

const PUBLIC_CARD = {
  id: 'other-card-id-789',
  owner_id: TARGET_USER_ID,
  title: 'Публичная карта другого пользователя',
  description: '',
  is_public: true,
  ttl_hours: 0,
  view_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const SUBSCRIPTION = {
  id: 'sub-id-001',
  card_id: PUBLIC_CARD.id,
  user_id: MOCK_USER.id,
  created_at: new Date().toISOString(),
}

test.describe('Подписка на карту пользователя', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)

    // Mock auth/me
    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      })
    })

    // Mock GET /api/users/:id
    await page.route(`**/api/users/${TARGET_USER_ID}`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TARGET_PROFILE),
        })
      } else {
        route.continue()
      }
    })

    // Mock GET /api/users/:id/cards
    await page.route(`**/api/users/${TARGET_USER_ID}/cards*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cards: [PUBLIC_CARD] }),
      })
    })

    // Mock GET /api/me/subscriptions — initially empty
    await page.route('**/api/me/subscriptions*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ subscriptions: [] }),
      })
    })

    // Mock POST /api/subscriptions
    await page.route('**/api/subscriptions', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(SUBSCRIPTION),
        })
      } else {
        route.continue()
      }
    })

    // Mock push notifications
    await page.route('**/api/notifications/subscribe', (route) => {
      route.fulfill({ status: 200, body: '{}' })
    })

    await page.goto(`/users/${TARGET_USER_ID}`)
  })

  test('отображает профиль пользователя', async ({ page }) => {
    await expect(page.getByText('Другой пользователь')).toBeVisible()
    await expect(page.getByText('Тестовый профиль')).toBeVisible()
  })

  test('показывает публичные карты пользователя', async ({ page }) => {
    await expect(page.getByText('Публичные карты')).toBeVisible()
    await expect(page.getByText('Публичная карта другого пользователя')).toBeVisible()
  })

  test('отображает кнопку "Подписаться" для чужого профиля', async ({ page }) => {
    await expect(page.getByTestId('subscribe-btn')).toBeVisible()
    await expect(page.getByTestId('subscribe-btn')).toHaveText(/Подписаться/)
  })

  test('кнопка "Подписаться" меняется на "Подписан" после нажатия', async ({ page }) => {
    // Initially show subscribe button
    await expect(page.getByTestId('subscribe-btn')).toBeVisible()

    // Click subscribe
    await page.getByTestId('subscribe-btn').click()

    // After successful subscription, button should change to "Подписан"
    await expect(page.getByTestId('unsubscribe-btn')).toBeVisible()
    await expect(page.getByTestId('unsubscribe-btn')).toHaveText(/Подписан/)
    await expect(page.getByTestId('subscribe-btn')).not.toBeVisible()
  })

  test('отписка меняет кнопку обратно на "Подписаться"', async ({ page }) => {
    let subscribed = false

    // Override subscription routes for this test
    await page.route('**/api/me/subscriptions*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          subscriptions: subscribed ? [SUBSCRIPTION] : [],
        }),
      })
    })

    await page.route('**/api/subscriptions', (route) => {
      if (route.request().method() === 'POST') {
        subscribed = true
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(SUBSCRIPTION),
        })
      } else {
        route.continue()
      }
    })

    await page.route(`**/api/subscriptions/${SUBSCRIPTION.id}`, (route) => {
      if (route.request().method() === 'DELETE') {
        subscribed = false
        route.fulfill({ status: 204, body: '' })
      } else {
        route.continue()
      }
    })

    // Subscribe
    await page.getByTestId('subscribe-btn').click()
    await expect(page.getByTestId('unsubscribe-btn')).toBeVisible()

    // Unsubscribe
    await page.getByTestId('unsubscribe-btn').click()
    await expect(page.getByTestId('subscribe-btn')).toBeVisible()
    await expect(page.getByTestId('subscribe-btn')).toHaveText(/Подписаться/)
  })

  test('не показывает кнопку Subscribe на своём профиле', async ({ page }) => {
    // Navigate to own profile
    await page.route(`**/api/users/${MOCK_USER.id}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...TARGET_PROFILE, id: MOCK_USER.id, display_name: MOCK_USER.display_name }),
      })
    })

    await page.goto(`/users/${MOCK_USER.id}`)

    await expect(page.getByTestId('subscribe-btn')).not.toBeVisible()
    await expect(page.getByTestId('unsubscribe-btn')).not.toBeVisible()
  })
})
