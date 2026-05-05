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

---

## Сессия 2 — 2026-05-05 · агенты: backend + frontend (параллельно)

---

### [TASK-1.4] Google OAuth 2.0 + JWT

**Микрозадачи:**
- [x] **1.4.2** `POST /auth/google` — обмен Google auth code на user info; создание/обновление пользователя в БД
- [x] **1.4.3** Генерация JWT access token (15 мин, HS256) + refresh token (30 дней, UUID, хранится SHA256-хэшем)
- [x] **1.4.4** Middleware `AuthRequired` — Bearer token → парсинг Claims → `c.Set("user_id", uuid)`; 401 при невалидном токене
- [x] **1.4.5** `POST /auth/refresh` — валидация refresh token, ротация (старый удаляется, новый создаётся)
- [x] **1.4.6** `POST /auth/logout` — удаление refresh token из БД
- [x] **1.4.7** `GET /auth/me` — возвращает профиль авторизованного пользователя
- [x] Миграция 010: таблица `refresh_tokens` (token_hash, user_id FK, expires_at, индекс на user_id)
- [x] Подключение DB + migrator в `main.go`; wire-up auth routes
- [x] `config.go` — добавлен метод `DBConfig.URL()` для postgres URL (нужен migrator)

**Файлы:**
```
backend/internal/auth/google.go
backend/internal/auth/jwt.go
backend/internal/domain/user.go
backend/internal/handler/auth.go
backend/internal/middleware/auth.go
backend/internal/repository/user.go
backend/internal/repository/refresh_token.go
backend/internal/config/config.go  (добавлен URL())
backend/cmd/server/main.go          (DB + migrator + auth routes)
backend/migrations/010_refresh_tokens.{up,down}.sql
```

**Ветка:** `feature/TASK-1.4` → merged into `main`

---

### [TASK-5.1] Инициализация React проекта

**Микрозадачи:**
- [x] **5.1.1** Vite 5 + React 18 + TypeScript (strict mode, path alias `@/` → `src/`)
- [x] **5.1.2** Tailwind CSS v3 + PostCSS + autoprefixer
- [x] **5.1.3** React Router v6: `BrowserRouter` в `main.tsx`, `ProtectedRoute` (redirect `/login` если не авторизован)
- [x] **5.1.4** HTTP-клиент `src/api/client.ts` — axios с двумя interceptors: attach Bearer token + auto-refresh при 401 (queue pending requests, rotate refresh token)
- [x] **5.1.5** WebSocket клиент `src/ws/client.ts` — подключение с токеном, event emitter по типу сообщения, exponential backoff reconnect (1s → 30s max)
- [x] **5.1.6** Zustand store `src/store/auth.ts` — tokens + user, persist в localStorage, `setTokens` / `setUser` / `logout`
- [x] PWA `public/manifest.json` (standalone display, theme_color, icons)

**Файлы:**
```
frontend/index.html
frontend/package.json
frontend/package-lock.json
frontend/tsconfig.json
frontend/tsconfig.node.json
frontend/vite.config.ts
frontend/tailwind.config.js
frontend/postcss.config.js
frontend/.gitignore
frontend/public/manifest.json
frontend/src/main.tsx
frontend/src/App.tsx
frontend/src/index.css
frontend/src/api/client.ts
frontend/src/api/types.ts
frontend/src/store/auth.ts
frontend/src/ws/client.ts
```

**Ветка:** `feature/TASK-5.1` → merged into `main`

---

## Сессия 3 — 2026-05-05 · агенты: backend + frontend (параллельно)

---

### [TASK-2.1] Cards CRUD

**Микрозадачи:**
- [x] `internal/domain/card.go` — модель `Card`: ID (uuid), OwnerID, Title, Description, IsPublic, TTLHours, ViewCount, soft delete через `DeletedAt *time.Time`
- [x] `internal/repository/card.go` — `CardRepo`: `Create`, `FindByID` (исключает soft-deleted), `FindByOwnerID` (pagination), `FindPublic` (IsPublic=true, pagination), `Update` (db.Save), `Delete` (soft delete + проверка owner), `IncrementViewCount`
- [x] `internal/handler/card.go` — `CardHandler` с 5 endpoints: `POST /cards` (title required, max 200 символов, 201), `GET /cards` (limit/offset, без auth), `GET /cards/:id` (приватные только owner, инкремент ViewCount), `GET /users/:id/cards` (фильтрация приватных для чужих), `PUT /cards/:id` (owner only, 403), `DELETE /cards/:id` (owner only, soft delete)
- [x] `cmd/server/main.go` — CardRepo + CardHandler wire-up, регистрация роутов `/cards` + `/users/:id/cards`

**Файлы:**
```
backend/internal/domain/card.go        (новый)
backend/internal/repository/card.go    (новый)
backend/internal/handler/card.go       (новый)
backend/cmd/server/main.go             (добавлены card routes)
```

**Ветка:** `feature/TASK-2.1` → merged into `main`

---

### [TASK-5.3] Карта (Leaflet)

**Микрозадачи:**
- [x] `npm install leaflet react-leaflet @types/leaflet`
- [x] `src/hooks/useGeolocation.ts` — хук с `watchPosition`, возвращает `{ position, error, loading }`, cleanup при unmount
- [x] `src/components/Map/MapView.tsx` — `MapContainer` + `TileLayer` (OpenStreetMap), `CircleMarker` текущей позиции, спиннер при `loading`, fix иконок Leaflet для Vite через `new URL(..., import.meta.url)`
- [x] `src/pages/MapPage.tsx` — страница-обёртка `w-full h-screen overflow-hidden`
- [x] `src/App.tsx` — роут `/` заменён с заглушки на `<MapPage />`

**Файлы:**
```
frontend/src/hooks/useGeolocation.ts           (новый)
frontend/src/components/Map/MapView.tsx        (новый)
frontend/src/pages/MapPage.tsx                 (новый)
frontend/src/App.tsx                           (обновлён)
frontend/package.json                          (добавлены leaflet зависимости)
frontend/package-lock.json
```

**Ветка:** `feature/TASK-5.3` → merged into `main`

---

## Сессия 4 — 2026-05-05 · агенты: backend + backend + frontend (три задачи)

---

### [TASK-2.2] Markers CRUD

**Микрозадачи:**
- [x] `internal/domain/marker.go` — Marker: NotificationType/ExpirationType ENUMs, `pq.StringArray` для images/tags, PostGIS поля отдельно (latitude/longitude)
- [x] `internal/repository/marker.go` — raw SQL INSERT с `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`, cursor-based pagination (newest/oldest/popular), `FindNearby` (ST_DWithin), soft delete, marker_count инкремент/декремент
- [x] `internal/middleware/auth.go` — добавлен `OptionalAuth` (устанавливает user_id если токен валиден, не блокирует)
- [x] `internal/handler/marker.go` — `POST/GET /cards/:id/markers`, `GET/PUT/DELETE /markers/:id`, nearby_markers в ответе CREATE, view_count только для автора, запрет обновления истёкших меток
- [x] `cmd/server/main.go` — wire-up MarkerRepo + MarkerHandler, роуты

**Файлы:**
```
backend/internal/domain/marker.go        (новый)
backend/internal/repository/marker.go    (новый)
backend/internal/handler/marker.go       (новый)
backend/internal/middleware/auth.go      (OptionalAuth добавлен)
backend/cmd/server/main.go               (marker routes)
```

**Ветка:** `feature/TASK-2.2` → merged into `main`

---

### [TASK-3.1] Подписки

**Микрозадачи:**
- [x] `internal/domain/subscription.go` — Subscription: UserID, TargetCardID?, TargetUserID?
- [x] `internal/repository/subscription.go` — Create, FindByID, FindByUserAndCard, FindByUserAndTargetUser, FindByUser, Delete, IncrementSubscriberCount, DecrementSubscriberCount
- [x] `internal/handler/subscription.go` — `POST /subscriptions` (проверка public карты, дедупликация, нельзя на себя), `DELETE /subscriptions/:id` (декремент subscriber_count), `GET /me/subscriptions` (раздельно: карты и юзеры)
- [x] `cmd/server/main.go` — wire-up SubRepo + SubHandler, роуты

**Файлы:**
```
backend/internal/domain/subscription.go        (новый)
backend/internal/repository/subscription.go    (новый)
backend/internal/handler/subscription.go       (новый)
backend/cmd/server/main.go                     (subscription routes)
```

**Ветка:** `feature/TASK-3.1` → merged into `main`

---

### [TASK-5.4] Управление картами UI

**Микрозадачи:**
- [x] `src/api/cards.ts` — cardsApi: listPublic, listByOwner, getById, create, update, delete; типы Card, CreateCardPayload
- [x] `src/store/cards.ts` — useCardsStore (Zustand): myCards[], fetchMyCards, createCard, deleteCard
- [x] `src/pages/MyCardsPage.tsx` — страница `/my-cards`: список карт, статусы (публичная/приватная), inline-удаление с подтверждением, спиннер/ошибка
- [x] `src/components/Cards/CreateCardModal.tsx` — модальная форма: title, description, public/private toggle, валидация
- [x] `src/pages/CardPage.tsx` — страница `/cards/:id`: sidebar список меток + Leaflet карта с маркерами
- [x] `src/App.tsx` — роуты `/my-cards` и `/cards/:id`

**Файлы:**
```
frontend/src/api/cards.ts                         (новый)
frontend/src/store/cards.ts                       (новый)
frontend/src/components/Cards/CreateCardModal.tsx (новый)
frontend/src/pages/MyCardsPage.tsx                (новый)
frontend/src/pages/CardPage.tsx                   (новый)
frontend/src/App.tsx                              (обновлён)
```

**Ветка:** `feature/TASK-5.4` → merged into `main`

---

### [TASK-2.3] Лайки / Дизлайки

**Микрозадачи:**
- [x] **2.3.1** `POST /markers/:id/likes` — toggle-эндпоинт: same type=remove, diff type=switch
- [x] **2.3.2** Атомарный `INSERT ON CONFLICT … DO UPDATE` + пересчёт `like_weight` в одной транзакции
- [x] **2.3.3** Проверка `allow_likes = true` перед применением действия
- [x] **2.3.4** (stub) WebSocket broadcast — оставлен TODO в хэндлере для TASK-4.1

**Файлы:**
```
backend/internal/domain/like.go          (новый)
backend/internal/repository/like.go     (новый)
backend/internal/handler/like.go        (новый)
backend/cmd/server/main.go              (обновлён: likeRepo, likeHandler, роут POST /markers/:id/likes)
tasks/BOARD.json                        (TASK-2.3 → merged)
```

**Ветка:** `feature/TASK-2.3` → merged into `main`

---

### [TASK-2.4] Комментарии

**Микрозадачи:**
- [x] **2.4.1** `GET /markers/:id/comments` — список, новые сверху, cursor-пагинация
- [x] **2.4.2** `POST /markers/:id/comments` — проверка `allow_comments`, парсинг `@UUID` mentions, INCREMENT comment_count
- [x] **2.4.3** `DELETE /comments/:id` — мягкое удаление, автор или owner карты, DECREMENT comment_count

**Файлы:**
```
backend/internal/domain/comment.go          (новый)
backend/internal/repository/comment.go     (новый — FindByMarkerID, Create, FindByID, Delete, ExtractMentions)
backend/internal/handler/comment.go        (новый — GET/POST /markers/:id/comments, DELETE /comments/:id)
backend/cmd/server/main.go                 (обновлён: commentRepo, commentHandler, роуты)
tasks/BOARD.json                           (TASK-2.4 → merged)
```

**Ветка:** `feature/TASK-2.4` → merged into `main`

---

### [TASK-5.5] Создание/редактирование метки UI

**Микрозадачи:**
- [x] **5.5.1** Клик на Leaflet карту → форма создания с координатами (только для owner карты)
- [x] **5.5.2** Поля формы: title, description, tags (max 5), TTL picker (Вечная/До времени/До конца дня), фото (превью через createObjectURL), настройки (allow_comments/likes/is_draft/notification_type)
- [x] **5.5.3** Диалог «В радиусе 200м уже есть метка» — Посмотреть / Лайкнуть (TODO) / Комментировать (TODO) / Создать свою
- [x] **5.5.4** TTL countdown на карточке: useTtlCountdown хук, TtlBadge (animate-pulse при <10 мин, «Истекла» при истечении)

**Файлы:**
```
frontend/src/api/markers.ts                   (новый — markersApi CRUD, типы MarkerData/CreateMarkerPayload)
frontend/src/components/CreateMarkerModal.tsx (новый — полная форма с NearbyMarkersDialog)
frontend/src/pages/CardPage.tsx               (обновлён — MapClickHandler, CreateMarkerModal, MarkerCard, TtlBadge)
tasks/BOARD.json                              (TASK-5.5 → merged)
```

**Ветка:** `feature/TASK-5.5` → merged into `main`
