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

---

### [TASK-5.11] Дизайн-система: інтеграція UI

**Мікрозадачі:**
- [x] **5.11.1** Tailwind config — brand/slate/heat/semantic кольори, Inter + JetBrains Mono, custom radius/shadow
- [x] **5.11.2** index.html — Google Fonts preconnect, theme-color #ef4444
- [x] **5.11.3** index.css — base layer (font, antialiased, Leaflet z-index), component classes
- [x] **5.11.4** `components/ui/Icon.tsx` — inline SVG іконки (20+ icons, lucide-compatible paths)
- [x] **5.11.5** `components/ui/Avatar.tsx` — градієнтний аватар з ініціалами або img
- [x] **5.11.6** `components/ui/MarkerPin.tsx` — SVG pin, heatColor(weight) export
- [x] **5.11.7** `components/ui/PrivacyBadge.tsx` — PUBLIC/LINK_ONLY/PRIVATE badge
- [x] **5.11.8** `components/HeatLegend.tsx` — шкала heat, bottom-left overlay
- [x] **5.11.9** `components/FAB.tsx` — круглий + button, shadow-pin, brand-500
- [x] **5.11.10** `components/MapControls.tsx` — zoom/locate/layer switcher + onThemeChange callback
- [x] **5.11.11** `components/TopBar.tsx` — логотип, SearchBar dropdown, NotificationsDropdown, UserDropdown
- [x] **5.11.12** `components/LeftDrawer.tsx` — 360px slide-in, tabs Позначки/Картки/Мої, filter chips
- [x] **5.11.13** `components/RightDrawer.tsx` — 420px, photo header, stats, like/route actions, comments
- [x] **5.11.14** `components/Map/MapView.tsx` — кастомні SVG-маркери (DivIcon + heatColor), TileLayer switcher, LocateControl
- [x] **5.11.15** `pages/MapPage.tsx` — fullscreen MainApp: усі overlay-компоненти разом
- [x] **5.11.16** `App.tsx` — спрощений роутинг (тільки /, без /my-cards, /cards/:id)
- [x] **5.11.17** `DESIGN.md` — довідник токенів для агентів
- [x] **5.11.18** `CLAUDE.md` — додано посилання на DESIGN.md

**Файли:**
```
frontend/tailwind.config.js                  (оновлено — design tokens)
frontend/index.html                          (оновлено — Google Fonts)
frontend/src/index.css                       (оновлено — base + component classes)
frontend/src/App.tsx                         (спрощено — 1 роут)
frontend/src/pages/MapPage.tsx               (переписано — fullscreen MainApp)
frontend/src/components/Map/MapView.tsx      (оновлено — heat markers, theme switcher)
frontend/src/components/TopBar.tsx           (новий)
frontend/src/components/LeftDrawer.tsx       (новий)
frontend/src/components/RightDrawer.tsx      (новий)
frontend/src/components/MapControls.tsx      (оновлено — onThemeChange prop)
frontend/src/components/HeatLegend.tsx       (новий)
frontend/src/components/FAB.tsx              (новий)
frontend/src/components/ui/Icon.tsx          (новий)
frontend/src/components/ui/Avatar.tsx        (новий)
frontend/src/components/ui/MarkerPin.tsx     (новий)
frontend/src/components/ui/PrivacyBadge.tsx  (новий)
DESIGN.md                                    (новий)
CLAUDE.md                                    (оновлено — UI секція)
tasks/BOARD.json                             (TASK-5.11 → merged)
```

**Гілка:** `feature/TASK-5.11` → merged into `main`

---

### [TASK-2.5] Просмотри (view_count)

**Мікрозадачі:**
- [x] **2.5.1** `POST /markers/:id/views` — фіксує перегляд з дедуплікацією по `X-Session-ID` (in-memory TTL 1 год)
- [x] **2.5.2** `view_count` в GET /markers/:id — тільки для автора (вже було реалізовано)
- [x] Прибрано авто-інкремент з `GET /markers/:id` — тепер клієнт викликає POST /views явно

**Файли:**
```
backend/internal/handler/view.go     (новий — ViewHandler з viewCache)
backend/internal/handler/marker.go   (прибрано IncrementViewCount з GetMarker)
backend/cmd/server/main.go           (додано viewHandler + маршрут POST /:id/views)
tasks/BOARD.json                     (TASK-2.5 → merged)
```

**Гілка:** `feature/TASK-2.5` → merged into `main`

---

### [TASK-1.5] Rate Limiting Middleware

**Мікрозадачі:**
- [x] **1.5.1** Sliding-window rate limiter (in-memory, per IP + endpoint)
- [x] **1.5.2** Ліміти по endpoint: 20 меток/год, 100 лайків/год, 60 коментарів/год, 10 auth/хв; default 60 req/хв
- [x] **1.5.3** `429 Too Many Requests` з заголовком `Retry-After` (секунди)

**Файли:**
```
backend/internal/middleware/ratelimit.go  (новий — RateLimit middleware)
backend/cmd/server/main.go                (підключено r.Use(middleware.RateLimit()))
tasks/BOARD.json                          (TASK-1.5 → merged)
```

**Гілка:** `feature/TASK-1.5` → merged into `main`

---

## Сессия 3 — 2026-05-05 · агент: backend-3

---

### [TASK-3.3-A] Профили: GET /users/:id

**Микрозадачи:**
- [x] **3.3.1** `GET /users/:id` — возвращает профиль: `display_name`, `avatar_url`, `bio`, `is_private`, `card_count`, `created_at`
- [x] Удалённый пользователь → заглушка `{id, display_name: "Удалённый пользователь", deleted: true}`
- [x] `CardRepo.CountPublicByOwner` — подсчёт публичных карт пользователя

**Файлы:**
```
backend/internal/handler/user.go        (новый — UserHandler.GetUser)
backend/internal/repository/card.go     (добавлен CountPublicByOwner)
backend/cmd/server/main.go              (userHandler + роут GET /users/:id)
```

**Ветка:** `feature/TASK-3.3-A` → merged into `main`

---

### [TASK-3.2] Блокировка пользователей

**Микрозадачи:**
- [x] **3.2.1** `POST /users/:id/block` — USER_BLOCK + удаление взаимных подписок
- [x] **3.2.2** `POST /cards/:id/block` — CARD_BLOCK (только owner карты) + удаление подписки заблокированного
- [x] **3.2.3** `DELETE /users/:id/block` — разблокировать пользователя
- [x] **3.2.4** `DELETE /cards/:id/block` — разблокировать всех на карте
- [x] **3.2.5** `GET /me/blocked` — список всех блоков текущего пользователя
- [x] **3.2.6** `BlockCheck` middleware — проверяет `owner_id` из контекста, отдаёт 403 если заблокирован
- [x] `FindByFingerprint` — для auto-block при повторном логине (TASK-3.2.7, привязка к auth flow)

**Файлы:**
```
backend/internal/domain/block.go           (новый — Block struct, BlockType enum)
backend/internal/repository/block.go       (новый — CRUD + IsBlocked + FindByFingerprint)
backend/internal/handler/block.go          (новый — BlockUser/CardBlock/Unblock/ListBlocked)
backend/internal/middleware/block_check.go (новый — BlockCheck middleware)
backend/cmd/server/main.go                 (blockRepo, blockHandler, 5 новых роутов)
```

**Ветка:** `feature/TASK-3.2` → merged into `main`

---

### [TASK-3.3-B] Профили: PUT /users/me (редактирование)

**Микрозадачи:**
- [x] **3.3.2** `PUT /users/me` — обновление `display_name` (макс 100), `bio` (макс 150), `avatar_url`
- [x] Проверка что хотя бы одно поле передано
- [x] `UserRepo.UpdateProfile` — атомарное обновление через GORM Updates
- [x] `UserHandler.UpdateMe`

**Файлы:**
```
backend/internal/handler/user.go    (добавлен UpdateMe)
backend/internal/repository/user.go (добавлен UpdateProfile)
backend/cmd/server/main.go          (роут PUT /users/me)
```

**Ветка:** `feature/TASK-3.3-B` → merged into `main`

---

### [TASK-3.3-C] Профили: DELETE /users/me (soft delete + cascade)

**Микрозадачи:**
- [x] **3.3.3** `DELETE /users/me` — soft delete пользователя (`deleted_at = NOW()`, `fcm_token = ""`)
- [x] Cascade soft delete всех карт пользователя (`CardRepo.SoftDeleteByOwner`)
- [x] Инвалидация всех refresh-токенов (`RefreshTokenRepo.DeleteByUserID`)
- [x] Маркеры недоступны автоматически через FK на soft-deleted карты

**Файлы:**
```
backend/internal/handler/user.go    (добавлен DeleteMe)
backend/internal/repository/user.go (добавлен SoftDelete)
backend/internal/repository/card.go (добавлен SoftDeleteByOwner)
backend/cmd/server/main.go          (роут DELETE /users/me)
```

**Ветка:** `feature/TASK-3.3-B` → merged into `main`

---

## Сессия 4 — 2026-05-05 · агент: backend-5

---

### [TASK-3.4] Лента активности

**Микрозадачи:**
- [x] **3.4.1** `GET /feed` — маркеры из подписанных карт + карт подписанных юзеров, cursor pagination (before/before_id)
- [x] **3.4.2** Дедупликация натуральная — маркер принадлежит одной карте, OR-условие не дублирует
- [x] **3.4.3** Фильтры: `deleted_at IS NULL`, `expires_at > NOW()`, `is_draft = false`, блокировки через `blocked_users`
- [x] `next_cursor` в ответе для постраничной загрузки

**Файлы:**
```
backend/internal/repository/feed.go  (новый — FeedRepo.FeedItems)
backend/internal/handler/feed.go     (новый — FeedHandler.GetFeed)
backend/cmd/server/main.go           (feedRepo, feedHandler, GET /feed)
```

**Ветка:** `feature/TASK-3.4` → merged into `main`

---

### [TASK-3.5] Поиск

**Микрозадачи:**
- [x] **3.5.1** `GET /search?type=markers&q=` — fulltext через `to_tsvector`/`plainto_tsquery('simple')`, фильтр по тегам (`&&`), сортировка по `like_weight`
- [x] **3.5.2** `GET /search?type=cards&q=` — fulltext по PUBLIC картам, сортировка по `subscriber_count`
- [x] **3.5.3** `GET /search?type=users&q=` — ILIKE по `display_name`, без удалённых
- [x] Параметры: `limit` (макс 100), `offset`, `tags` (через запятую)
- [x] `domain/card.go`: добавлены поля `MarkerCount`, `SubscriberCount`

**Файлы:**
```
backend/internal/repository/search.go  (новый — SearchRepo: SearchMarkers/Cards/Users)
backend/internal/handler/search.go     (новый — SearchHandler.Search)
backend/internal/domain/card.go        (MarkerCount + SubscriberCount)
backend/cmd/server/main.go             (searchRepo, searchHandler, GET /search)
```

**Ветка:** `feature/TASK-3.5` → merged into `main`

---

## Сессия 5 — 2026-05-05 · агент: backend-6

---

### [TASK-4.1-A] WebSocket: Connection Manager

**Микрозадачи:**
- [x] **4.1.1** `GET /ws` — WebSocket endpoint с JWT auth (gorilla/websocket upgrader)
- [x] **4.1.2** `Manager` — хранит активные соединения `map[userID][]*Client`, поддерживает несколько соединений на юзера
- [x] `Register` / `Unregister` — потокобезопасно через `sync.RWMutex`
- [x] `SendToUser` / `Broadcast` — non-blocking (drop при полном буфере с warn)
- [x] `readPump` / `writePump` — goroutine per connection, ping каждые 45s, pong timeout 60s
- [x] `NewClient` + `SetConn` — конструктор с буферизованным `send` каналом (256)

**Файлы:**
```
backend/internal/ws/manager.go   (новый — Manager + Client)
backend/internal/handler/ws.go   (новый — WSHandler.ServeWS)
backend/cmd/server/main.go       (wsManager, wsHandler, GET /ws)
backend/go.mod                   (gorilla/websocket v1.5.3, firebase.google.com/go/v4 v4.19.0)
```

**Ветка:** `feature/TASK-4.1-A` → merged into `main`

---

### [TASK-4.3-A] FCM: Firebase Admin SDK + сохранение токена

**Микрозадачи:**
- [x] **4.3.1** `pkg/fcm/client.go` — Firebase Admin SDK init (serviceAccountJSON или ADC), `SendToToken`, `SendToTokens` (multicast, обработка `registration-token-not-registered`), `DataPayload`
- [x] **4.3.2** `POST /users/me/fcm-token` — сохранение FCM registration token в `users.fcm_token`
- [x] **4.3.5** Logout очищает FCM token (`ClearFCMToken` через `optionalAuth` на `/auth/logout`)
- [x] `UserRepo`: `UpdateFCMToken`, `ClearFCMToken`, `FindByFCMToken`
- [x] FCM init в main.go — warn если не настроен, не паникует (graceful degradation)

**Файлы:**
```
backend/pkg/fcm/client.go           (новый — FCM Client)
backend/internal/repository/user.go (UpdateFCMToken/ClearFCMToken/FindByFCMToken)
backend/internal/handler/user.go    (SaveFCMToken)
backend/internal/handler/auth.go    (Logout + ClearFCMToken)
backend/cmd/server/main.go          (fcm.New, POST /users/me/fcm-token)
```

**Ветка:** `feature/TASK-4.3-A` → merged into `main`

---

## Сессия 6 — 2026-05-05 · агент: backend-7

---

### [TASK-4.1-B] WebSocket: Broadcast лайков и комментариев

**Микрозадачи:**
- [x] **4.1.3** Broadcast при лайке: `{"type":"like_update","marker_id":"...","like_weight":N}` — все три пути ToggleLike (remove / create / switch)
- [x] **4.1.4** Broadcast при новом комментарии: `{"type":"new_comment","marker_id":"...","comment":{...}}`
- [x] `wsManager` инициализируется первым в main.go, передаётся в `likeHandler` и `commentHandler`

**Файлы:**
```
backend/internal/handler/like.go    (wsHub + broadcastLikeUpdate)
backend/internal/handler/comment.go (wsHub + Broadcast после CreateComment)
backend/cmd/server/main.go          (порядок инициализации)
```

**Ветка:** `feature/TASK-4.1-B` → merged into `main`

---

### [TASK-4.1-C] WebSocket: Heartbeat + ping-pong

**Микрозадачи:**
- [x] **4.1.5** Ping-pong реализован в TASK-4.1-A: `writePump` пингует каждые 45s, `readPump` сбрасывает `SetReadDeadline` при pong (60s таймаут)
- [x] `Manager.ConnectedCount()` — суммарное число соединений
- [x] `Manager.ConnectedUsers()` — число уникальных подключённых пользователей
- [x] `GET /ws/stats` — публичный эндпоинт мониторинга `{connections, connected_users}`

**Файлы:**
```
backend/internal/ws/manager.go  (ConnectedCount + ConnectedUsers)
backend/internal/handler/ws.go  (Stats handler)
backend/cmd/server/main.go      (GET /ws/stats)
```

**Ветка:** `feature/TASK-4.1-C` → merged into `main`

---

### [TASK-5.7] Социальные функции UI

**Микрозадачи:**
- [x] **5.7.1** Страница профиля `/users/:id` — аватар (round + fallback з ініціалами), display_name, bio, лічильники карт/підписників, список публічних карт користувача
- [x] **5.7.2** Кнопки Підписатися / Відписатися / Заблокувати на чужому профілі; subscribe через `POST /subscriptions`, unsubscribe через `DELETE /subscriptions/:id`, block через `POST /users/:id/block`
- [x] **5.7.3** Модальне вікно блокування (`BlockModal`) з radio-кнопками "Заблокувати карту" / "Заблокувати користувача" та підтвердженням
- [x] **5.7.4** Сторінка налаштувань `/settings/blocked` — список заблокованих юзерів і карт (GET /me/blocked), кнопка "Розблокувати" для кожного
- [x] Новий API-модуль `usersApi` + `subscriptionsApi` у `frontend/src/api/users.ts`
- [x] Zustand-стор `useSocialStore` у `frontend/src/store/social.ts`
- [x] Навігація в `TopBar`: пункти "Профіль" → `/users/:id`, "Заблоковані" → `/settings/blocked`
- [x] Нові захищені роути в `App.tsx`

**Файлы:**
```
frontend/src/api/users.ts                      (usersApi + subscriptionsApi — новий файл)
frontend/src/store/social.ts                   (useSocialStore — новий файл)
frontend/src/components/Social/BlockModal.tsx  (новий компонент)
frontend/src/pages/UserProfilePage.tsx         (новий маршрут /users/:id)
frontend/src/pages/BlockedSettingsPage.tsx     (новий маршрут /settings/blocked)
frontend/src/App.tsx                           (додані роути)
frontend/src/components/TopBar.tsx             (навігація в UserButton)
```

**Ветка:** `feature/TASK-5.7` → merged into `main`

---

### [TASK-5.2] Auth UI

**Мікрозадачі:**
- [x] **5.2.1** `LoginPage.tsx` — сторінка `/login` з кнопкою "Увійти через Google" (SVG-іконка Google), редирект на OAuth URL, автоматичний redirect якщо вже авторизований
- [x] **5.2.2** `AuthCallbackPage.tsx` — обробка OAuth callback: отримання `code` з query params → `POST /auth/google` → збереження JWT в Zustand-сторі → redirect на `/`; обробка помилок та `error` param; захист від React StrictMode double-invoke через `useRef`
- [x] **5.2.3** Logout у `TopBar.tsx` → `POST /auth/logout` + очищення стору + redirect на `/login`
- [x] `api/auth.ts` — `exchangeCodeForTokens`, `buildGoogleOAuthUrl`, `logoutRequest`, `fetchMe`
- [x] `ProtectedRoute.tsx` — redirect неавторизованих на `/login`
- [x] `AuthInit` у `App.tsx` — перевірка токена через `GET /auth/me` при старті

**Файли:**
```
frontend/src/pages/LoginPage.tsx          (нова сторінка /login)
frontend/src/pages/AuthCallbackPage.tsx   (OAuth callback /auth/callback)
frontend/src/api/auth.ts                  (auth API functions)
frontend/src/components/ProtectedRoute.tsx
frontend/src/App.tsx                      (AuthInit + роути)
frontend/src/components/TopBar.tsx        (logout)
```

**Гілка:** `feature/TASK-5.2` → merged into `main`

---

### [TASK-4.2] Геолокація API

**Мікрозадачі:**
- [x] **4.2.1** `POST /users/me/location` — приймає `{lat, lon, accuracy}`, PostGIS `ST_DWithin` з фільтрами підписок/блокувань, повертає `{low_accuracy, nearby_markers[]}` з `distance_meters`
- [x] **4.2.2** `GET /feed/nearby?lat=&lon=&radius=` — публічні метки рядом, cursor pagination (limit/cursor), опціональна авторизація (виключає заблокованих)

**Файли:**
```
backend/internal/repository/location.go  (LocationRepo: FindNearbyForUser, FindNearbyPublic)
backend/internal/handler/location.go     (LocationHandler: UpdateLocation, GetNearbyFeed)
backend/cmd/server/main.go               (роути + wiring)
backend/internal/domain/card.go          (+Radius field)
```

**Гілка:** `feature/TASK-4.2-TASK-4.3-B` → merged into `main`

---

### [TASK-4.3-B] FCM: Push батчинг + cooldown

**Мікрозадачі:**
- [x] **4.3.3** Батчинг: перевірка cooldown для кожної метки → один FCM push "Вы рядом с: X, Y, Z"
- [x] **4.3.4** Cooldown: `notification_cooldowns` таблиця per (user_id, marker_id); повторне уведомлення після виходу з радіусу або через 1 годину
- [x] Cleanup невалідних токенів при отриманні `registration-token-not-registered` від FCM
- [x] Міграція `011_notification_cooldowns` (up/down)

**Файли:**
```
backend/internal/service/notification.go              (NotificationService.SendNearbyPush)
backend/internal/repository/notification_cooldown.go  (CooldownRepo: Get/Upsert/MarkLeft)
backend/migrations/011_notification_cooldowns.up.sql
backend/migrations/011_notification_cooldowns.down.sql
backend/cmd/server/main.go                             (cooldownRepo + notifService wiring)
```

**Гілка:** `feature/TASK-4.2-TASK-4.3-B` → merged into `main`

---

## Сессия 7 — 2026-05-05 · агент: backend-10

---

### [TASK-6.3] PostgreSQL оптимізація

**Мікрозадачі:**
- [x] **6.3.1** Міграція `012_pg_optimizations.up.sql` — GIST індекс `idx_markers_location_gist` на `markers.location` (для ST_DWithin)
- [x] **6.3.2/6.3.3** Partial indexes: `idx_markers_active` (card_id + created_at DESC WHERE deleted_at IS NULL), `idx_markers_pagination` (created_at DESC + id WHERE deleted_at IS NULL)
- [x] **6.3.2** Partial index для TTL-воркера: `idx_markers_expires_at_partial` (expires_at WHERE deleted_at IS NULL AND expires_at IS NOT NULL)
- [x] **6.3.1** Full-text search GIN індекс: `idx_markers_fts` (to_tsvector('russian', title || description))
- [x] Partial index для коментарів: `idx_comments_marker_id_partial` (marker_id + created_at DESC WHERE deleted_at IS NULL)
- [x] Індекс для notification_cooldowns: `idx_notif_cooldowns_marker` (marker_id)
- [x] **6.3.5** Connection pool оновлено в `db.go`: MaxOpenConns=25, MaxIdleConns=10, ConnMaxLifetime=5m, ConnMaxIdleTime=2m
- [x] Всі нові індекси використовують `CREATE INDEX IF NOT EXISTS` — безпечно для повторного запуску
- [x] Перевірено що нові індекси не дублюють існуючі з migration 009

**Файли:**
```
backend/migrations/012_pg_optimizations.up.sql    (новий)
backend/migrations/012_pg_optimizations.down.sql  (новий)
backend/internal/repository/db.go                 (оновлено — connection pool)
```

**Гілка:** `feature/TASK-6.3` → merged into `main`

---

## Сессия 8 — 2026-05-05 · агент: frontend-5

---

### [TASK-5.8] Лента активності UI

**Мікрозадачі:**
- [x] **5.8.1** `api/feed.ts` — `feedApi.getFeed(params)` з cursor-пагінацією (limit/before/before_id), типи `FeedItem`, `FeedMarker`, `FeedCard`, `FeedActor`, `FeedResponse`
- [x] **5.8.2** `pages/FeedPage.tsx` — сторінка `/feed` (ProtectedRoute): infinite scroll через `IntersectionObserver` (rootMargin 200px), skeleton-loader (3 анімовані картки), spinner при підвантаженні, повідомлення "Нових записів немає" при вичерпанні даних, обробка помилок з кнопкою повтору
- [x] **5.8.3** `FeedCard` компонент (вбудований у FeedPage): превью фото або placeholder з Icon "image", heat-badge з heatColor(like_weight), title + description (line-clamp), теги (pill-badges, макс 4 + overflow), джерело карти з іконкою layers, Actor (Avatar + display_name) + relative time (timeAgo helper), лічильники heart + message
- [x] **5.8.4** Клік по карточці → навігація на `/cards/:card_id`
- [x] Роут `/feed` додано в `App.tsx` (ProtectedRoute)
- [x] Посилання "Стрічка активності" додано в `TopBar.tsx` (UserButton dropdown)

**Файли:**
```
frontend/src/api/feed.ts           (новий)
frontend/src/pages/FeedPage.tsx    (новий)
frontend/src/App.tsx               (додано роут /feed + імпорт FeedPage)
frontend/src/components/TopBar.tsx (додано пункт меню Стрічка активності)
```

---

### [TASK-5.6-A] Деталі метки: галерея фото + теги + view_count

**Мікрозадачі:**
- [x] **5.6-A.1** `components/MarkerDetailDrawer.tsx` — новий компонент: боковий drawer справа (420px) на десктопі, bottom sheet на мобайлі (max-h-90vh + rounded-t-2xl); бекдроп для мобайлу з onClose; анімації slideRight/slideUp
- [x] **5.6-A.2** `PhotoGallery` — горизонтальний слайдер: prev/next кнопки, лічильник "1 / N", індикатори-точки, заглушка з Icon "image" + текст "Нет фото" якщо photos порожній
- [x] **5.6-A.3** Кнопка закрити (X) в правому верхньому куті поверх галереї
- [x] **5.6-A.4** Заголовок (h2, 20px/bold) + badge "Чернетка" якщо is_draft
- [x] **5.6-A.5** Опис (whitespace-pre-wrap, 14px)
- [x] **5.6-A.6** Теги — pill badges (bg-brand-50 / text-brand-700) з `#` префіксом
- [x] **5.6-A.7** Stats row: like_weight (heatColor), comment_count, view_count (тільки якщо isOwner === true) з іконкою eye
- [x] **5.6-A.8** TTL badge з useTtlCountdown: normal/critical (animate-pulse)/expired стани
- [x] **5.6-A.9** Metadata: time-ago (timeAgo helper) + координати до 5 знаків після коми (font-mono)
- [x] **5.6-A.10** Інтеграція в `CardPage.tsx`: стан `drawerMarker`, відкривається при кліку на маркер у sidebar та на пін карти (eventHandlers.click)
- [x] **5.6-A.11** `api/markers.ts` — додано `getMarker(id)` alias (аліас для getById)

**Файли:**
```
frontend/src/components/MarkerDetailDrawer.tsx  (новий)
frontend/src/pages/CardPage.tsx                 (додано імпорт + drawerMarker state + інтеграція)
frontend/src/api/markers.ts                     (додано getMarker alias)
```

**Гілка:** `feature/TASK-5.8` → merged into `main`

---

### [TASK-4.5] TTL Background Worker

**Мікрозадачі:**
- [x] `internal/worker/ttl_worker.go` — TTLWorker: Run(ctx) + cleanup(): FindExpired(100) → DeletePhotos → SoftDeleteExpired → DecrementMarkerCount, zerolog
- [x] `internal/repository/marker.go` — додані FindExpired(limit) та SoftDeleteExpired(ids []uuid.UUID)
- [x] `internal/config/config.go` — TTLWorkerInterval (TTL_WORKER_INTERVAL_MINUTES env, default 5)
- [x] `cmd/server/main.go` — signal.NotifyContext для graceful shutdown + go ttlWorker.Run(ctx)

**Файли:**
```
backend/internal/worker/ttl_worker.go       (новий)
backend/internal/repository/marker.go       (додані методи)
backend/internal/config/config.go           (нові поля)
backend/cmd/server/main.go                  (graceful shutdown + worker wire)
```

**Гілка:** `feature/TASK-4.5` → merged into `main`

---

### [TASK-4.3-C] FCM: Cleanup невалідних токенів

**Мікрозадачі:**
- [x] `internal/worker/fcm_cleanup_worker.go` — FCMCleanupWorker: batch SendToTokens ping (500 токенів), ClearFCMToken для невалідних
- [x] `internal/repository/user.go` — додано FindWithFCMToken(limit)
- [x] `internal/config/config.go` — FCMCleanupInterval (FCM_CLEANUP_INTERVAL_HOURS env, default 6)
- [x] `cmd/server/main.go` — go fcmCleanup.Run(ctx)

**Файли:**
```
backend/internal/worker/fcm_cleanup_worker.go  (новий)
backend/internal/repository/user.go            (додано FindWithFCMToken)
```

**Гілка:** `feature/TASK-4.5` → merged into `main`

---

### [TASK-6.4] Security Audit

**Мікрозадачі:**
- [x] `internal/middleware/security_headers.go` — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- [x] `internal/middleware/cors.go` — allowlist-based CORS (CORS_ALLOWED_ORIGINS env), Vary: Origin, OPTIONS preflight
- [x] `internal/config/config.go` — CORSAllowedOrigins []string
- [x] `cmd/server/main.go` — r.Use(SecurityHeaders()) + r.Use(CORS(...))
- [x] `SECURITY.md` — аудит: JWT alg check ✓, magic bytes ✓, SQL placeholders ✓, input limits ✓. Known limitation: rate limiting IP-based only.

**Файли:**
```
backend/internal/middleware/security_headers.go  (новий)
backend/internal/middleware/cors.go              (новий)
backend/SECURITY.md                              (новий)
```

**Гілка:** `feature/TASK-4.5` → merged into `main`

---

### [TASK-5.6-B] Деталі метки: лайк/дизлайк + real-time лічильник

**Мікрозадачі:**
- [x] LikeBar у MarkerDetailDrawer: кнопки LIKE (brand-500) / DISLIKE (slate-700) з `rounded-full`
- [x] Оптимістичний UI з rollback при помилці API
- [x] Real-time `like_weight` через `wsClient.on('like_update', ...)` → `setLocalWeight`
- [x] `like_weight` прибрано зі stats row, залишені `comment_count` та `view_count`
- [x] `markersApi.toggleLike(markerId, type)` → POST /markers/:id/likes
- [x] `LikeType`, `LikeResponse` інтерфейси в api/markers.ts

**Файли:**
```
frontend/src/components/MarkerDetailDrawer.tsx  (LikeBar, WS підписка)
frontend/src/api/markers.ts                     (LikeType, LikeResponse, toggleLike)
```

**Гілка:** `feature/TASK-5.6-BCD` → merged into `main`

---

### [TASK-5.6-C] Деталі метки: коментарі + @mention autocomplete

**Мікрозадачі:**
- [x] `CommentsSection` компонент: завантаження 20 коментарів при відкритті, cursor pagination "Показати ще"
- [x] Real-time нові коментарі через `wsClient.on('new_comment', ...)` → prepend до списку
- [x] @mention autocomplete: `/@(\w*)$/` detection → GET /search?type=users&q=... → dropdown → вставка `@display_name`
- [x] Enter (без Shift) надсилає коментар якщо suggestions закриті
- [x] `allow_comments === false` → "Коментарі вимкнені" замість форми
- [x] Avatar: перша літера author_name у `bg-brand-100 text-brand-700` кружку
- [x] `localCommentCount` в MarkerDetailDrawer синхронізується через `onCountChange`
- [x] `Comment`, `CommentsResponse`, `getComments`, `createComment`, `deleteComment` в api/markers.ts

**Файли:**
```
frontend/src/components/MarkerDetailDrawer.tsx  (CommentsSection, @mention, WS)
frontend/src/api/markers.ts                     (Comment, CommentsResponse, методи)
```

**Гілка:** `feature/TASK-5.6-BCD` → merged into `main`

---

### [TASK-5.6-D] Деталі метки: кнопка 'Поскаржитись'

**Мікрозадачі:**
- [x] `ReportModal` компонент у MarkerDetailDrawer.tsx: backdrop + centered modal (z-[201])
- [x] Radio-вибір причини: spam / inappropriate / misinformation / copyright / other (styled brand-50/brand-300)
- [x] Optional textarea коментар (max 500 chars)
- [x] loading / error / success стани (success: зелена галочка + дяку)
- [x] Кнопка "Поскаржитись" тільки для `!isOwner`, розміщена під metadata
- [x] `ReportReason`, `reportMarker` в api/markers.ts → POST /markers/:id/reports

**Файли:**
```
frontend/src/components/MarkerDetailDrawer.tsx  (ReportModal, report button)
frontend/src/api/markers.ts                     (ReportReason, reportMarker)
```

**Гілка:** `feature/TASK-5.6-BCD` → merged into `main`
