import { test, expect } from '@playwright/test'
import { setupAuth, MOCK_USER, MOCK_TOKEN } from './helpers/auth'

const CARD_ID = 'card-abc-123'

const MOCK_CARD = {
  id: CARD_ID,
  owner_id: MOCK_USER.id,
  title: 'Тестовая карта',
  description: 'Описание тестовой карты',
  is_public: true,
  ttl_hours: 0,
  view_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

test.describe('Создание карточки', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state before page load
    await setupAuth(page)

    // Mock GET /api/auth/me — called by AuthInit on mount
    await page.route('**/api/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: MOCK_USER }),
      })
    })

    // Mock GET /api/users/:id/cards — called by fetchMyCards
    await page.route(`**/api/users/${MOCK_USER.id}/cards*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cards: [], limit: 20, offset: 0 }),
      })
    })

    // Mock POST /api/cards
    await page.route('**/api/cards', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CARD),
        })
      } else {
        route.continue()
      }
    })

    // Mock push notification subscription endpoint (VAPID)
    await page.route('**/api/notifications/subscribe', (route) => {
      route.fulfill({ status: 200, body: '{}' })
    })

    await page.goto('/my-cards')
  })

  test('отображает пустой список карт', async ({ page }) => {
    await expect(page.getByText('Нет карт')).toBeVisible()
  })

  test('открывает модалку при нажатии "Создать карту"', async ({ page }) => {
    await page.getByTestId('create-card-btn').click()
    await expect(page.getByText('Новая карта')).toBeVisible()
    await expect(page.getByTestId('create-card-form')).toBeVisible()
  })

  test('создаёт карточку и она появляется в списке', async ({ page }) => {
    // Update mock to return the new card in the list after creation
    let cardsData: typeof MOCK_CARD[] = []

    await page.route(`**/api/users/${MOCK_USER.id}/cards*`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cards: cardsData, limit: 20, offset: 0 }),
      })
    })

    await page.route('**/api/cards', (route) => {
      if (route.request().method() === 'POST') {
        cardsData = [MOCK_CARD]
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CARD),
        })
      } else {
        route.continue()
      }
    })

    // Reload to pick up new route handlers
    await page.reload()

    // Open modal
    await page.getByTestId('create-card-btn').click()
    await expect(page.getByTestId('create-card-form')).toBeVisible()

    // Fill in the title
    await page.getByTestId('card-title-input').fill('Тестовая карта')

    // Submit
    await page.getByTestId('create-card-submit').click()

    // Modal should close and card should appear
    await expect(page.getByTestId('create-card-form')).not.toBeVisible()
    await expect(page.getByTestId('card-item')).toBeVisible()
    await expect(page.getByTestId('card-title')).toHaveText('Тестовая карта')
  })

  test('кнопка "Создать" заблокирована без заголовка', async ({ page }) => {
    await page.getByTestId('create-card-btn').click()
    const submitBtn = page.getByTestId('create-card-submit')
    await expect(submitBtn).toBeDisabled()

    await page.getByTestId('card-title-input').fill('Что-то')
    await expect(submitBtn).toBeEnabled()
  })

  test('отображает токен авторизации в запросах', async ({ page }) => {
    let capturedAuthHeader = ''

    await page.route('**/api/cards', (route) => {
      capturedAuthHeader = route.request().headers()['authorization'] ?? ''
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CARD),
        })
      } else {
        route.continue()
      }
    })

    await page.getByTestId('create-card-btn').click()
    await page.getByTestId('card-title-input').fill('Auth test card')
    await page.getByTestId('create-card-submit').click()

    expect(capturedAuthHeader).toContain(MOCK_TOKEN)
  })
})
