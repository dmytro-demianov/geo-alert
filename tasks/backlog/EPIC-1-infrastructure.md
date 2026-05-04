# EPIC-1: Инфраструктура & Auth

Настройка Go проекта, PostgreSQL+PostGIS, Docker, Google OAuth 2.0 и JWT.

---

## TASK-1.1 `backend` Инициализация Go проекта 🔲

- **TASK-1.1.1** 🔲 Создать структуру директорий (`cmd/`, `internal/`, `pkg/`, `migrations/`)
- **TASK-1.1.2** 🔲 Настроить `go.mod` с зависимостями (Gin, GORM, golang-migrate, google/uuid)
- **TASK-1.1.3** 🔲 Настроить конфигурацию через `.env` и `config.go` (DB_URL, JWT_SECRET, GOOGLE_CLIENT_ID, etc.)
- **TASK-1.1.4** 🔲 Настроить логирование (zerolog или zap)
- **TASK-1.1.5** 🔲 Базовый `main.go` с инициализацией Gin и health-check endpoint `GET /health`

## TASK-1.2 `ops` Docker Setup 🔲

- **TASK-1.2.1** 🔲 `Dockerfile` для backend (multi-stage build: builder + runtime)
- **TASK-1.2.2** 🔲 `docker-compose.yml` с сервисами: backend, postgres (с PostGIS), adminer
- **TASK-1.2.3** 🔲 `Makefile` с командами: `make dev`, `make build`, `make migrate`, `make test`
- **TASK-1.2.4** 🔲 `.env.example` с описанием всех переменных

## TASK-1.3 `backend` БД и Миграции 🔲

- **TASK-1.3.1** 🔲 Настроить golang-migrate, подключить к Makefile
- **TASK-1.3.2** 🔲 Миграция 001: extension PostGIS, ENUM типы
- **TASK-1.3.3** 🔲 Миграция 002: таблица `users`
- **TASK-1.3.4** 🔲 Миграция 003: таблица `cards`
- **TASK-1.3.5** 🔲 Миграция 004: таблица `markers` (с `location GEOMETRY`)
- **TASK-1.3.6** 🔲 Миграция 005: таблицы `likes`, `comments`
- **TASK-1.3.7** 🔲 Миграция 006: таблицы `subscriptions`, `blocked_users`
- **TASK-1.3.8** 🔲 Миграция 007: таблицы `notifications`, `reports`
- **TASK-1.3.9** 🔲 Миграция 008: таблица `rate_limits`
- **TASK-1.3.10** 🔲 Индексы: GIST на `markers.location`, btree на `users.email`, `users.google_id`, `cards.owner_id`, `markers.card_id`, `markers.expires_at`
- **TASK-1.3.11** 🔲 CHECK constraint: `blocked_users.blocker_id != blocked_users.blocked_user_id`

## TASK-1.4 `backend` Google OAuth 2.0 + JWT 🔲

- **TASK-1.4.1** 🔲 Создать Google OAuth credentials (Client ID + Secret) в Google Console
- **TASK-1.4.2** 🔲 `POST /auth/google` — принять auth code, обменять на Google user info
- **TASK-1.4.3** 🔲 Генерация JWT access token (15 мин) + refresh token (30 дней)
- **TASK-1.4.4** 🔲 Middleware `AuthRequired` — проверять JWT, возвращать 401 если невалидный
- **TASK-1.4.5** 🔲 `POST /auth/refresh` — принять refresh token, вернуть новый access token
- **TASK-1.4.6** 🔲 `POST /auth/logout` — инвалидировать refresh token, очистить FCM token
- **TASK-1.4.7** 🔲 `GET /auth/me` — вернуть текущего авторизованного юзера

## TASK-1.5 `backend` Rate Limiting Middleware 🔲

- **TASK-1.5.1** 🔲 Реализовать in-memory rate limiter (sliding window или token bucket)
- **TASK-1.5.2** 🔲 Настроить лимиты по endpoint (20 меток/час, 100 лайков/час и т.д.)
- **TASK-1.5.3** 🔲 Возвращать `429 Too Many Requests` с заголовком `Retry-After`

## TASK-1.6 `backend` Mock API Spec 🔲

> Создаётся **первым** после TASK-1.1, чтобы frontend-агент мог работать параллельно не дожидаясь реального backend.

- **TASK-1.6.1** 🔲 Создать `tasks/mock-api.yaml` (OpenAPI 3.0)
- **TASK-1.6.2** 🔲 Описать все endpoint'ы из PLAN.md с примерами ответов (`examples:`)
  - Auth: `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/me`
  - Cards: CRUD + список меток
  - Markers: CRUD, лайки, комментарии, жалобы, просмотры
  - Users: профиль, подписки, блокировки
  - Feed, Search, Notifications
  - WebSocket: описать структуры сообщений в `x-websocket-messages`
- **TASK-1.6.3** 🔲 Поддерживать файл актуальным при изменении контрактов в ходе работы
