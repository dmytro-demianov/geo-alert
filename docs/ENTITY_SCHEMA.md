# Entity Schema — geo-alert

> Актуально для миграций 001–013. Источник истины: `backend/migrations/` + `backend/internal/domain/` + `backend/internal/handler/`.

---

## Содержание

1. [ENUMs](#enums)
2. [Сущности](#сущности)
3. [Схема связей](#схема-связей)
4. [Constraints и уникальные ключи](#constraints-и-уникальные-ключи)
5. [Правила валидации (handler-уровень)](#правила-валидации-handler-уровень)
6. [Индексы](#индексы)

---

## ENUMs

| Тип | Значения |
|-----|---------|
| `expiration_type` | `ETERNAL` · `UNTIL_TIME` · `PERIOD` · `END_OF_DAY` |
| `notification_type` | `ON_ENTER` · `ON_APPROACH` · `BOTH` |
| `like_type` | `LIKE` · `DISLIKE` |
| `block_type` | `USER_BLOCK` · `CARD_BLOCK` |
| `notification_event_type` | `GEO_ENTER` · `GEO_APPROACH` · `NEW_LIKE` · `NEW_COMMENT` · `NEW_MENTION` · `CARD_PRIVATE` · `MARKER_DELETED_IN_RADIUS` · `REPORT_RECEIVED` · `NEW_SUBSCRIBER` |

---

## Сущности

### users

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK, `uuid_generate_v4()` |
| `google_id` | VARCHAR(255) | NOT NULL, UNIQUE |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `display_name` | VARCHAR(255) | NOT NULL |
| `avatar_url` | TEXT | nullable |
| `bio` | VARCHAR(150) | nullable |
| `is_private` | BOOLEAN | NOT NULL, DEFAULT false |
| `browser_fingerprint` | VARCHAR(255) | nullable |
| `fcm_token` | TEXT | nullable |
| `deleted_at` | TIMESTAMPTZ | nullable — soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### cards

> Схема актуальна после migration 013 (`privacy`, `allow_contributors`, `timezone` удалены).

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `owner_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `title` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | nullable |
| `is_public` | BOOLEAN | NOT NULL, DEFAULT true |
| `radius` | INT | NOT NULL, DEFAULT 200 (метры) |
| `ttl_hours` | INT | NOT NULL, DEFAULT 0 (0 = вечная) |
| `view_count` | BIGINT | NOT NULL, DEFAULT 0 |
| `marker_count` | INT | NOT NULL, DEFAULT 0 — денормализация |
| `subscriber_count` | INT | NOT NULL, DEFAULT 0 — денормализация |
| `deleted_at` | TIMESTAMPTZ | nullable — soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### markers

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `card_id` | UUID | NOT NULL, FK → `cards.id` CASCADE DELETE |
| `created_by` | UUID | NOT NULL, FK → `users.id` SET NULL on delete |
| `title` | VARCHAR(200) | NOT NULL |
| `description` | TEXT | nullable |
| `location` | GEOMETRY(Point, 4326) | NOT NULL — PostGIS |
| `latitude` | DOUBLE PRECISION | NOT NULL |
| `longitude` | DOUBLE PRECISION | NOT NULL |
| `images` | TEXT[] | NOT NULL, DEFAULT '{}' — max 5 URL |
| `tags` | TEXT[] | NOT NULL, DEFAULT '{}' — max 5 |
| `like_weight` | INT | NOT NULL, DEFAULT 0 — денормализация (LIKE +1, DISLIKE -1) |
| `comment_count` | INT | NOT NULL, DEFAULT 0 — денормализация |
| `view_count` | INT | NOT NULL, DEFAULT 0 |
| `allow_comments` | BOOLEAN | NOT NULL, DEFAULT true |
| `allow_likes` | BOOLEAN | NOT NULL, DEFAULT true |
| `is_draft` | BOOLEAN | NOT NULL, DEFAULT false |
| `notifications_enabled` | BOOLEAN | NOT NULL, DEFAULT true |
| `notification_type` | `notification_type` | NOT NULL, DEFAULT 'ON_ENTER' |
| `expires_at` | TIMESTAMPTZ | nullable |
| `expiration_type` | `expiration_type` | NOT NULL, DEFAULT 'ETERNAL' |
| `deleted_at` | TIMESTAMPTZ | nullable — soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### likes

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `marker_id` | UUID | NOT NULL, FK → `markers.id` CASCADE DELETE |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `type` | `like_type` | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Уникальность:** `(marker_id, user_id)` — один голос от пользователя на метку.  
**Toggle-логика:** тот же тип → удалить, другой тип → переключить. Пересчёт `like_weight` атомарен (ON CONFLICT).

---

### comments

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `marker_id` | UUID | NOT NULL, FK → `markers.id` CASCADE DELETE |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `text` | VARCHAR(500) | NOT NULL |
| `mentions` | UUID[] | NOT NULL, DEFAULT '{}' — ссылки на `users.id` |
| `deleted_at` | TIMESTAMPTZ | nullable — soft delete |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### subscriptions

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `target_card_id` | UUID | nullable, FK → `cards.id` CASCADE DELETE |
| `target_user_id` | UUID | nullable, FK → `users.id` CASCADE DELETE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Check:** `target_card_id IS NOT NULL OR target_user_id IS NOT NULL`  
**Уникальность:** `(user_id, target_card_id)` и `(user_id, target_user_id)`  
**Правило:** подписаться можно только на публичную карту.

---

### blocked_users

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `blocker_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `blocked_user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `block_type` | `block_type` | NOT NULL, DEFAULT 'USER_BLOCK' |
| `target_card_id` | UUID | nullable, FK → `cards.id` CASCADE DELETE |
| `blocked_fingerprints` | TEXT[] | NOT NULL, DEFAULT '{}' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Check:** `blocker_id != blocked_user_id` — нельзя заблокировать себя.  
`USER_BLOCK` — блокирует пользователя глобально.  
`CARD_BLOCK` — блокирует пользователя только для конкретной карты (`target_card_id`).

---

### notifications

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE — получатель |
| `type` | `notification_event_type` | NOT NULL |
| `related_marker_id` | UUID | nullable, FK → `markers.id` SET NULL |
| `related_card_id` | UUID | nullable, FK → `cards.id` SET NULL |
| `related_user_id` | UUID | nullable, FK → `users.id` SET NULL — инициатор |
| `message` | VARCHAR(500) | NOT NULL |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### reports

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `reporter_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `marker_id` | UUID | NOT NULL, FK → `markers.id` CASCADE DELETE |
| `reason` | VARCHAR(500) | NOT NULL |
| `comment` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

**Правило:** нельзя пожаловаться на собственную метку.  
**Дедупликация:** один пользователь — одна жалоба на метку (уровень репозитория).

---

### refresh_tokens

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `id` | UUID | PK |
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `token_hash` | VARCHAR(64) | NOT NULL, UNIQUE — SHA-256 |
| `fcm_token` | TEXT | nullable |
| `expires_at` | TIMESTAMPTZ | NOT NULL — 30 дней |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |

---

### rate_limits

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `key` | VARCHAR(255) | PK — формат `"<user_id>:<action>"` |
| `count` | INT | NOT NULL, DEFAULT 1 |
| `reset_at` | TIMESTAMPTZ | NOT NULL |

---

### notification_cooldowns

| Колонка | Тип | Ограничения |
|---------|-----|-------------|
| `user_id` | UUID | NOT NULL, FK → `users.id` CASCADE DELETE |
| `marker_id` | UUID | NOT NULL, FK → `markers.id` CASCADE DELETE |
| `last_notified_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() |
| `last_left_at` | TIMESTAMPTZ | nullable |

**PK:** `(user_id, marker_id)`  
Используется для батчинга push-уведомлений о приближении — предотвращает спам.

---

## Схема связей

```
users ──────────────────────────────────────────────────────────────────┐
  │ 1                                                                    │
  │ N                                                                    │
cards ─────────────────────────────────────────────────────┐            │
  │ 1                                                       │            │
  │ N                                                       │ sub        │
markers ──────────────┬─────────────────────────┐          │            │
  │ 1                 │ 1                        │ 1        │            │
  ├─ N ─ likes        ├─ N ─ comments            ├─ N ─ reports         │
  │       │ N             │ N                    │       │ N            │
  │       └── users       └── users              │       └── users      │
  │                                              │                      │
  ├─ N ─ notifications (related_marker_id)       │                      │
  │                                              │                      │
  └─ N ─ notification_cooldowns                  │                      │
              │ N                                 │                      │
              └── users                          │                      │
                                                 │                      │
subscriptions: users ──── target_card_id ─────── cards                  │
               users ──── target_user_id ─────────────────────── users  │
                                                                         │
blocked_users: blocker_id ─── users                                     │
               blocked_user_id ─── users                                │
               target_card_id ─── cards                                 │
                                                                         │
refresh_tokens: user_id ─── users                                        │
notifications:  user_id / related_user_id ─── users ───────────────────┘
                related_card_id ─── cards
```

### Краткая таблица FK

| Таблица | Колонка | → | On Delete |
|---------|---------|---|-----------|
| cards | owner_id | users.id | CASCADE |
| markers | card_id | cards.id | CASCADE |
| markers | created_by | users.id | SET NULL |
| likes | marker_id | markers.id | CASCADE |
| likes | user_id | users.id | CASCADE |
| comments | marker_id | markers.id | CASCADE |
| comments | user_id | users.id | CASCADE |
| subscriptions | user_id | users.id | CASCADE |
| subscriptions | target_card_id | cards.id | CASCADE |
| subscriptions | target_user_id | users.id | CASCADE |
| blocked_users | blocker_id | users.id | CASCADE |
| blocked_users | blocked_user_id | users.id | CASCADE |
| blocked_users | target_card_id | cards.id | CASCADE |
| notifications | user_id | users.id | CASCADE |
| notifications | related_marker_id | markers.id | SET NULL |
| notifications | related_card_id | cards.id | SET NULL |
| notifications | related_user_id | users.id | SET NULL |
| reports | reporter_id | users.id | CASCADE |
| reports | marker_id | markers.id | CASCADE |
| refresh_tokens | user_id | users.id | CASCADE |
| notification_cooldowns | user_id | users.id | CASCADE |
| notification_cooldowns | marker_id | markers.id | CASCADE |

---

## Constraints и уникальные ключи

| Таблица | Тип | Определение |
|---------|-----|-------------|
| users | UNIQUE | `google_id` |
| users | UNIQUE | `email` |
| likes | UNIQUE | `(marker_id, user_id)` |
| subscriptions | CHECK | `target_card_id IS NOT NULL OR target_user_id IS NOT NULL` |
| subscriptions | UNIQUE | `(user_id, target_card_id)` |
| subscriptions | UNIQUE | `(user_id, target_user_id)` |
| blocked_users | CHECK | `blocker_id != blocked_user_id` |
| refresh_tokens | UNIQUE | `token_hash` |
| notification_cooldowns | PK | `(user_id, marker_id)` |

---

## Правила валидации (handler-уровень)

### User

| Поле | Правило |
|------|---------|
| `display_name` | max 100 символов (UTF-8) |
| `bio` | max 150 символов (UTF-8) |
| `avatar_url` | свободный текст, nullable |
| PUT `/users/me` | хотя бы одно поле должно быть непустым |

### Card

| Поле | Правило |
|------|---------|
| `title` | required, max 200 символов (UTF-8) |
| `description` | optional |
| `is_public` | bool, default true |
| `ttl_hours` | int ≥ 0; 0 = без истечения |
| `radius` | int, default 200 (метры) |

### Marker

| Поле | Правило |
|------|---------|
| `title` | required, max 200 символов (UTF-8) |
| `latitude` | required, float64 |
| `longitude` | required, float64 |
| `images` | max 5 элементов |
| `tags` | max 5 элементов |
| `notification_type` | `ON_ENTER` \| `ON_APPROACH` \| `BOTH` |
| `expiration_type` | `ETERNAL` \| `UNTIL_TIME` \| `PERIOD` \| `END_OF_DAY` |
| `expires_at` | ISO 8601, обязателен если `expiration_type != ETERNAL` |
| PUT (update) | нельзя редактировать истёкшую метку → 409 Conflict |

### Comment

| Поле | Правило |
|------|---------|
| `text` | required, max 500 символов (UTF-8) |
| POST | `allow_comments` метки должен быть true |

### Like

| Поле | Правило |
|------|---------|
| `type` | required, `LIKE` \| `DISLIKE` |
| Toggle | тот же тип повторно → удаляет голос; другой тип → переключает |
| `like_weight` | пересчитывается атомарно: LIKE = +1, DISLIKE = -1 |

### Report

| Поле | Правило |
|------|---------|
| `reason` | required, max 500 символов |
| `comment` | optional |
| Бизнес-правило | репортер ≠ автор метки → 403 |
| Дедупликация | один репорт на пользователя per метка |

### Block

| Поле | Правило |
|------|---------|
| `block_type` | `USER_BLOCK` \| `CARD_BLOCK` |
| Бизнес-правило | `blocker_id != blocked_user_id` → 400 |
| `CARD_BLOCK` | требует `target_card_id` |
| Эффект | заблокированный пользователь получает 403 при доступе к контенту владельца |

### Subscription

| Правило | Детали |
|---------|--------|
| Цель | `target_card_id` или `target_user_id` — ровно одно |
| Карта | можно подписаться только на `is_public = true` карту |
| Дедупликация | UNIQUE constraint на уровне БД |

### Upload (фото)

| Правило | Детали |
|---------|--------|
| Поле | `photo` required (multipart/form-data) |
| Размер | max 10 MB |
| Формат | magic bytes: JPEG (`FF D8`), PNG (`89 50 4E 47`), WEBP (`52 49 46 46 … 57 45 42 50`) |

### Location

| Поле | Правило |
|------|---------|
| `lat` | required, float64 |
| `lon` | required, float64 |
| `accuracy` | optional, float64 (метры) |

---

## Индексы

### Базовые (migration 009)

| Таблица | Колонка(и) | Тип |
|---------|-----------|-----|
| cards | `owner_id` | BTREE |
| markers | `card_id` | BTREE |
| markers | `created_by` | BTREE |
| markers | `location` | GIST (перекрыт в 012) |
| likes | `marker_id` | BTREE |
| comments | `marker_id` | BTREE |
| subscriptions | `user_id` | BTREE |
| blocked_users | `blocker_id` | BTREE |
| blocked_users | `blocked_user_id` | BTREE |
| notifications | `user_id` | BTREE |
| refresh_tokens | `user_id` | BTREE |
| notification_cooldowns | `user_id` | BTREE |

### Оптимизации (migration 012)

| Имя | Таблица | Выражение | Тип | Partial WHERE |
|-----|---------|-----------|-----|---------------|
| `idx_markers_location_gist` | markers | `location` | GIST | — |
| `idx_markers_active` | markers | `(card_id, created_at DESC)` | BTREE | `deleted_at IS NULL` |
| `idx_markers_expires_at_partial` | markers | `expires_at` | BTREE | `deleted_at IS NULL AND expires_at IS NOT NULL` |
| `idx_markers_pagination` | markers | `(created_at DESC, id)` | BTREE | `deleted_at IS NULL` |
| `idx_markers_fts` | markers | `to_tsvector('russian', title \|\| description)` | GIN | — |
| `idx_comments_marker_id_partial` | comments | `(marker_id, created_at DESC)` | BTREE | `deleted_at IS NULL` |
| `idx_notif_cooldowns_marker` | notification_cooldowns | `marker_id` | BTREE | — |

---

## Денормализованные счётчики

Обновляются атомарно (SQL-инкремент/декремент) при каждой операции:

| Таблица | Поле | Источник |
|---------|------|---------|
| cards | `marker_count` | INSERT/soft-DELETE marker |
| cards | `subscriber_count` | INSERT/DELETE subscription |
| cards | `view_count` | GET /cards/:id |
| markers | `like_weight` | Upsert/Delete like (LIKE +1, DISLIKE -1) |
| markers | `comment_count` | INSERT/soft-DELETE comment |
| markers | `view_count` | GET /markers/:id (только автору видно) |
