# Changelog

История выполненных задач по сессиям. Ведётся агентом: после каждого `merge` задачи в `main` — добавляется запись.

Формат: `## [TASK-X.X] Название` → список выполненных микрозадач → созданные файлы.

---

## Сессия 1 — 2026-05-05 · агент: backend

---

### [TASK-1.1] Инициализация Go проекта

**Микрозадачи:**
- [x] **1.1.1** Создана структура директорий: `cmd/server/`, `internal/{config,handler,middleware,model,repository,service}/`, `pkg/logger/`, `migrations/`
- [x] **1.1.2** Настроен `go.mod` с зависимостями: Gin v1.12, zerolog v1.35, godotenv v1.5, golang-jwt/jwt v5.3, google/uuid v1.6, golang-migrate v4.19, GORM v1.31, gorm/driver/postgres (pgx v5)
- [x] **1.1.3** `internal/config/config.go` — загрузка ENV через godotenv; все группы переменных (Server, DB, Auth, Firebase, RateLimit); `requireEnv` паникует при отсутствии обязательных; `DBConfig.DSN()` строит connection string
- [x] **1.1.4** `pkg/logger/logger.go` — zerolog; human-readable ConsoleWriter в `development`, JSON в `production`
- [x] **1.1.5** `cmd/server/main.go` — Gin с `gin.Recovery()` и request logger middleware; `GET /health` возвращает `{"status":"ok","time":"..."}` с кодом 200
- [x] `.env.example` создан со всеми переменными окружения (Server, DB, Auth, Firebase, RateLimit)
- [x] `.gitignore` для backend (`.env`, бинарник)

**Файлы:**
```
backend/cmd/server/main.go
backend/internal/config/config.go
backend/pkg/logger/logger.go
backend/.env.example
backend/.gitignore
backend/go.mod
backend/go.sum
```

**Ветка:** `feature/TASK-1.1` → merged into `main`

---

### [TASK-1.6] Mock API Spec

**Микрозадачи:**
- [x] **1.6.1** Создан `tasks/mock-api.yaml` (OpenAPI 3.0.3)
- [x] **1.6.2** Описаны все endpoints с примерами ответов:
  - **Auth** (4 endpoints): `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
  - **Cards** (5 endpoints): CRUD + `GET /cards/:id/markers`
  - **Markers** (8 endpoints): CRUD, `POST /markers/:id/likes` (LIKE/DISLIKE/REMOVE атомарно), comments CRUD, reports, views
  - **Users** (5 endpoints): profile, update, delete, public cards, `/me` variants
  - **Subscriptions** (3 endpoints): subscribe, unsubscribe, my subscriptions
  - **Blocks** (5 endpoints): block/unblock user, block card, list blocked
  - **Feed** (2 endpoints): activity feed, `/feed/nearby` (lat/lon/radius)
  - **Search** (1 endpoint): `?type=markers|cards|users&q=...`
  - **Notifications** (3 endpoints): list (с unread_count), mark read, clear all
- [x] **1.6.2** Описаны компоненты: schemas (User, Card, GeoMarker, Comment, Notification, Subscription, Pagination, Error)
- [x] **1.6.2** `x-websocket-messages` — структуры WS событий: `GEO_ALERT` (несколько меток в одном событии), `MARKER_UPDATED`, `MARKER_DELETED`, `NEW_COMMENT`, `LOCATION_UPDATE`, `PING/PONG`
- [x] Rate limit ответы (429) с заголовком `Retry-After` на создание меток, лайки, комментарии

**Файлы:**
```
tasks/mock-api.yaml
```

**Ветка:** `feature/TASK-1.6` → merged into `main`

---

### [TASK-1.3] БД и миграции

**Микрозадачи:**
- [x] **1.3.1** Настроен golang-migrate v4 с драйверами `database/postgres` и `source/file`; обёртка `pkg/migrator/migrator.go`
- [x] **1.3.2** Миграция 001: `CREATE EXTENSION postgis`, `uuid-ossp`; ENUM типы: `card_privacy`, `expiration_type`, `notification_type`, `like_type`, `block_type`, `notification_event_type`
- [x] **1.3.3** Миграция 002: таблица `users` (soft delete через `deleted_at`, `browser_fingerprint`, `fcm_token`)
- [x] **1.3.4** Миграция 003: таблица `cards` (`radius INT`, `timezone VARCHAR`, `marker_count`, `subscriber_count`, soft delete)
- [x] **1.3.5** Миграция 004: таблица `markers` (`location GEOMETRY(Point,4326)`, `images TEXT[]`, `tags TEXT[]`, `like_weight`, TTL поля, soft delete)
- [x] **1.3.6** Миграция 005: таблица `likes` (`UNIQUE(marker_id, user_id)`); таблица `comments` (`mentions UUID[]`, soft delete)
- [x] **1.3.7** Миграция 006: таблица `subscriptions` (`CHECK(target_card_id IS NOT NULL OR target_user_id IS NOT NULL)`); таблица `blocked_users` (`block_type`, `blocked_fingerprints TEXT[]`)
- [x] **1.3.8** Миграция 007: таблица `notifications` (все типы событий); таблица `reports`
- [x] **1.3.9** Миграция 008: таблица `rate_limits` (key = `user_id:action`, `reset_at`)
- [x] **1.3.10** Миграция 009 — индексы:
  - `GIST` на `markers.location` (геопространственные запросы)
  - `btree` на `users.email`, `users.google_id`
  - `btree` на `cards.owner_id`, `cards.privacy`
  - `btree` на `markers.card_id`, `markers.created_by`, `markers.expires_at`, `markers.is_draft`
  - `btree` на `likes.marker_id`, `likes.user_id`
  - `btree` на `comments.marker_id`, `comments.user_id`
  - `btree` на `subscriptions.user_id`, partial на `target_card_id`, `target_user_id`
  - `btree` на `blocked_users.blocker_id`, `blocked_users.blocked_user_id`
  - Partial index на `notifications(user_id, is_read) WHERE is_read = false`
  - Partial indexes на все `deleted_at` колонки
- [x] **1.3.11** `CHECK` constraint `blocked_users.blocker_id != blocked_users.blocked_user_id`
- [x] `internal/repository/db.go` — GORM + pgx connection pool (`MaxOpenConns`, `MaxIdleConns`, `ConnMaxLifetime`)

**Файлы:**
```
backend/migrations/001_extensions_enums.{up,down}.sql
backend/migrations/002_users.{up,down}.sql
backend/migrations/003_cards.{up,down}.sql
backend/migrations/004_markers.{up,down}.sql
backend/migrations/005_likes_comments.{up,down}.sql
backend/migrations/006_subscriptions_blocks.{up,down}.sql
backend/migrations/007_notifications_reports.{up,down}.sql
backend/migrations/008_rate_limits.{up,down}.sql
backend/migrations/009_indexes.{up,down}.sql
backend/internal/repository/db.go
backend/pkg/migrator/migrator.go
```

**Ветка:** `feature/TASK-1.3` → merged into `main`
