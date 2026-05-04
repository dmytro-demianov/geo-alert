# GEO-ALERT: Полный дизайн функционала + Corner Cases

## Технический стек

### Frontend
- React + TypeScript
- Tailwind CSS
- Leaflet + OpenStreetMap (карты)
- WebSocket (real-time лайки/комментарии)
- Service Worker (PWA, push notifications)

### Backend
- Go (Gin)
- PostgreSQL + PostGIS
- Firebase Storage (только фото)
- Firebase Cloud Messaging (push)
- Google OAuth 2.0
- ~~Redis~~ (убрано из MVP)

---

## DOMAIN MODELS (с учётом corner cases)

```
User
├─ id UUID PK
├─ google_id VARCHAR UNIQUE
├─ email VARCHAR UNIQUE
├─ display_name VARCHAR             -- не уникальный
├─ avatar_url VARCHAR               -- nullable; "удалён" аватар при deleted=true
├─ bio VARCHAR(150)
├─ is_private BOOLEAN DEFAULT false
├─ deleted_at TIMESTAMP NULL        -- soft delete (аватар → стандартный "удалён")
├─ browser_fingerprint VARCHAR      -- для анти-обход блокировки
├─ created_at TIMESTAMP
├─ updated_at TIMESTAMP

Card
├─ id UUID PK
├─ owner_id UUID FK -> users
├─ title VARCHAR
├─ description TEXT
├─ privacy ENUM ('PRIVATE', 'LINK_ONLY', 'PUBLIC')
├─ allow_contributors BOOLEAN DEFAULT false
├─ radius INT                       -- ОДИН радиус на всю карту (для всех меток)
├─ timezone VARCHAR                 -- часовой пояс создателя (для END_OF_DAY меток)
├─ marker_count INT
├─ subscriber_count INT
├─ deleted_at TIMESTAMP NULL        -- soft delete → cascade delete markers
├─ created_at TIMESTAMP
├─ updated_at TIMESTAMP

GeoMarker
├─ id UUID PK
├─ card_id UUID FK -> cards
├─ created_by UUID FK -> users
├─ title VARCHAR(200)
├─ description TEXT(2000)
├─ location GEOMETRY(Point, 4326)   -- PostGIS
├─ latitude FLOAT
├─ longitude FLOAT
│  -- РАДИУС УБРАН: берётся из cards.radius
├─ images TEXT[]                    -- Firebase URLs (макс. 5 фото, только фото)
├─ tags TEXT[]                      -- макс. 5 тегов
├─ like_weight INT DEFAULT 0        -- likes - dislikes (может быть отрицательным)
├─ comment_count INT DEFAULT 0
├─ view_count INT DEFAULT 0         -- видит только создатель
├─ allow_comments BOOLEAN DEFAULT true
├─ allow_likes BOOLEAN DEFAULT true
├─ is_draft BOOLEAN DEFAULT false
├─ notifications_enabled BOOLEAN DEFAULT true
├─ notification_type ENUM ('ON_ENTER', 'ON_APPROACH', 'BOTH')
├─ expires_at TIMESTAMP NULL
├─ expiration_type ENUM ('ETERNAL', 'UNTIL_TIME', 'PERIOD', 'END_OF_DAY')
├─ deleted_at TIMESTAMP NULL        -- мягкое удаление (→ уведомление в радиусе)
├─ created_at TIMESTAMP
├─ updated_at TIMESTAMP

Like
├─ id UUID PK
├─ marker_id UUID FK -> markers
├─ user_id UUID FK -> users
├─ type ENUM ('LIKE', 'DISLIKE')
├─ created_at TIMESTAMP
├─ UNIQUE (marker_id, user_id)
-- Важно: лайки удаляются при delete метки (cascade)
-- Важно: лайки остаются при отключении allow_likes (просто скрыть UI)
-- Дизлайк: like_weight - 1; Лайк: like_weight + 1
-- Атомарно через UPDATE markers SET like_weight = like_weight + $delta

Comment
├─ id UUID PK
├─ marker_id UUID FK -> markers
├─ user_id UUID FK -> users
├─ text VARCHAR(500)
├─ mentions TEXT[]                  -- UUID юзеров @упомянутых
├─ deleted_at TIMESTAMP NULL
├─ created_at TIMESTAMP
├─ updated_at TIMESTAMP

Subscription
├─ id UUID PK
├─ user_id UUID FK -> users
├─ target_card_id UUID FK -> cards (nullable)
├─ target_user_id UUID FK -> users (nullable)
├─ created_at TIMESTAMP
├─ CHECK (target_card_id IS NOT NULL OR target_user_id IS NOT NULL)

BlockedUser
├─ id UUID PK
├─ blocker_id UUID FK -> users
├─ blocked_user_id UUID FK -> users
├─ block_type ENUM ('USER_BLOCK', 'CARD_BLOCK')
├─ target_card_id UUID FK -> cards (nullable, только для CARD_BLOCK)
├─ blocked_fingerprints TEXT[]      -- список fingerprints заблокированного
├─ created_at TIMESTAMP
-- CHECK: blocker_id != blocked_user_id (нельзя заблокировать себя)

Notification
├─ id UUID PK
├─ user_id UUID FK -> users
├─ type ENUM (...)
├─ related_marker_id UUID FK (nullable)
├─ related_card_id UUID FK (nullable)
├─ related_user_id UUID FK (nullable)
├─ message VARCHAR
├─ is_read BOOLEAN DEFAULT false
├─ created_at TIMESTAMP

Report
├─ id UUID PK
├─ reporter_id UUID FK -> users
├─ marker_id UUID FK -> markers
├─ reason VARCHAR(500)
├─ created_at TIMESTAMP
-- Создаёт уведомление для owner карты. Никаких автоматических действий.

RateLimit (Redis-заменитель через БД или in-memory)
├─ key VARCHAR (user_id:action)
├─ count INT
├─ reset_at TIMESTAMP
```

---

## КЛЮЧЕВЫЕ БИЗНЕС-ПРАВИЛА (Corner Cases зафиксированы)

### Создание / Удаление

| Событие | Поведение |
|---------|-----------|
| Удаление карты | Cascade: все метки, лайки, комментарии удаляются |
| Удаление аккаунта | Cascade: все карты, метки, лайки, комментарии удаляются |
| Метка другого юзера на карте | Остаётся при удалении аккаунта автора метки (orphan) или удаляется вместе с картой |
| Координаты в океане | Разрешено (не проверяем) |
| Лимиты (anti-spam) | Rate limit для ВСЕХ юзеров везде (создание меток, лайки, комментарии) |

### Время жизни (TTL)

| Параметр | Решение |
|----------|---------|
| Продление | Да, можно продлить активную метку |
| Восстановление истёкшей | Нельзя |
| Лайки/комментарии истёкшей | Удаляются вместе с меткой |
| Что видит юзер | Обратный отсчёт, при истечении — анимация удаления |
| Часовой пояс для END_OF_DAY | Часовой пояс создателя **карты** (сохранён в Card.timezone) |

### Радиус

| Параметр | Решение |
|----------|---------|
| Где задаётся | В карте (Card.radius), **единый для всех меток на карте** |
| Рендеринг | Круг вокруг каждой метки (стандартный, Leaflet Circle) |
| Перекрытие | Показываем оба круга, рендерим обычно |
| Юзер уже в радиусе при создании метки | Уведомление отправляется сразу |

### Права на карте

| Событие | Поведение |
|---------|-----------|
| Отзыв права создавать метки | Уже созданные метки подписчиков **остаются** |
| Подписчик редактирует метку | Может редактировать **только свои** метки на чужой карте |
| Создатель карты редактирует чужую метку | **Не может** (только удалить через жалобу) |
| Карта становится приватной | Все подписчики **теряют доступ мгновенно**, получают уведомление |

### Блокировка

| Параметр | Решение |
|----------|---------|
| Скорость блокировки | Мгновенно (при следующем API запросе заблокированного — 403) |
| Лайк до блокировки | Засчитывается (не откатывается) |
| Обход через новый аккаунт | Browser fingerprint; при совпадении fingerprint — авто-блок |
| Взаимная блокировка | Стандартное поведение (оба не видят друг друга) |
| Заблокировать себя | Запрещено (CHECK constraint в БД) |

### Лайки / Дизлайки

| Параметр | Решение |
|----------|---------|
| Система весов | `like_weight = sum(likes) - sum(dislikes)`. Может быть отрицательным. |
| Цвет маркера | По `like_weight`: <0 = серый, 0-2 = нейтральный, 3-5 = жёлтый, 6-10 = оранжевый, 10+ = красный |
| Отключение лайков | Лайки в БД остаются, вес сохраняется, просто скрывается кнопка в UI |
| При удалении метки | Уведомление всем юзерам в радиусе этой метки |
| Race condition | Атомарный UPDATE с `like_weight + delta` (нет race condition) |
| Кто видит лайки | Счётчик виден всем; кто именно лайкнул — TBD |

### Геолокация / Уведомления

| Параметр | Решение |
|----------|---------|
| Плохой GPS | Показывать индикатор точности; если accuracy > 100м — предупредить юзера |
| Быстрое движение | Уведомление успевает (серверная проверка при каждом GPS update) |
| Несколько меток одновременно | **Один push** с упоминанием всех: "Вы рядом с X, Y, Z метками" |
| Повторные уведомления | Cooldown: повторное уведомление не раньше чем через N мин (нужно определить N) |
| Нет интернета | Уведомление не отправляется; повторной попытки нет |
| Без разрешения на push | Toast уведомление на сайте (in-app, без push) |
| Несколько вкладок | Уведомление в **одну** (активную) вкладку |
| FCM токен при удалении аккаунта | Очищается |

### Подписки / Лента

| Параметр | Решение |
|----------|---------|
| Дублирование (подписан на юзера и его карту) | **Карта важнее**: одно уведомление, от подписки на карту |
| Сортировка ленты | Самые активные/большие (по последней активности) вверху |
| Карта стала приватной | Подписчики получают уведомление и теряют доступ |

### Профиль

| Параметр | Решение |
|----------|---------|
| Уникальность displayName | **Не уникальный** (как в Instagram) |
| Удалённый аккаунт | Аватар → стандартная иконка "Удалён", имя → "Удалённый пользователь" |
| Обновление аватара | Обновляется везде (в комментариях, метках, истории) |

### Медиафайлы

| Параметр | Решение |
|----------|---------|
| Типы файлов | **Только фото** (видео — в планах на будущее) |
| Максимальный размер | **10MB** на фото (типичный размер фото со смартфона) |
| Максимум фото | 5 фото на метку |
| Метка без фото | Разрешено |
| При удалении метки | Фото **обязательно удаляются** из Firebase Storage |

### Безопасность

| Параметр | Решение |
|----------|---------|
| Валидация координат на сервере | Не нужна |
| Rate Limiting | Да, на все API endpoints для всех юзеров |
| Жалобы | Юзер может пожаловаться → создатель карты получает уведомление. Без авто-действий. |
| Конкурентность лайков | Атомарный SQL UPDATE (нет race condition) |
| Конкурентность редактирования | Optimistic locking через updated_at (версионность) |

---

## RATE LIMITS (нужно определить цифры перед деплоем)

```
POST /cards/*/markers     → max 20 меток / час на юзера
POST /markers/*/likes     → max 100 лайков / час на юзера
POST /markers/*/comments  → max 50 комментариев / час на юзера
POST /subscriptions       → max 200 подписок / день
Любой endpoint            → max 1000 запросов / час на IP
```

---

## API ENDPOINTS (финальный список)

### Auth
```
POST   /auth/google              Sign in with Google
POST   /auth/refresh             Refresh token
POST   /auth/logout              Logout (очистить FCM token)
GET    /auth/me                  Current user
```

### Cards
```
POST   /cards                    Create card (включая radius, timezone)
GET    /cards/:id                Card details + markers
PUT    /cards/:id                Update card
DELETE /cards/:id                Delete card (cascade)
GET    /cards/:id/markers        List markers (search, filter, sort)
```

### Markers
```
POST   /cards/:id/markers        Create marker
GET    /markers/:id              Marker details
PUT    /markers/:id              Update marker (+ TTL продление)
DELETE /markers/:id              Delete marker (→ notify юзеров в радиусе)
POST   /markers/:id/likes        Like/Dislike/Remove (атомарно)
GET    /markers/:id/comments     List comments
POST   /markers/:id/comments     Add comment
DELETE /comments/:id             Delete comment
POST   /markers/:id/reports      Report marker (→ notify карты owner)
POST   /markers/:id/views        Record view (только счётчик, только создатель видит)
```

### Users & Subscriptions
```
GET    /users/:id                Profile
PUT    /users/me                 Update profile
DELETE /users/me                 Delete account (cascade, очистить FCM)
GET    /users/:id/cards          Public cards

POST   /subscriptions            Subscribe to card or user
DELETE /subscriptions/:id        Unsubscribe
GET    /me/subscriptions         My subscriptions

POST   /users/:id/block          Block user (+ сохранить fingerprint)
DELETE /users/:id/block          Unblock
POST   /cards/:id/block          Block card for user
GET    /me/blocked               List blocked
```

### Feed & Search & Notifications
```
GET    /feed                     Activity feed (paginated, sorted by activity)
GET    /feed/nearby              Nearby markers by lat/lon

GET    /search                   ?type=markers|cards|users&q=...

GET    /notifications            My notifications
PUT    /notifications/:id/read   Mark as read
DELETE /notifications            Clear all
```

### WebSocket
```
WS /ws                           Real-time: лайки, комментарии, геолокация alerts
```

---

## ЦВЕТ МАРКЕРОВ (like_weight система)

```
like_weight < 0       → #9CA3AF (серый, "непопулярная")
like_weight = 0-2     → #6B7280 (тёмно-серый, "нейтральная")
like_weight = 3-5     → #FBBF24 (жёлтый)
like_weight = 6-10    → #F97316 (оранжевый)
like_weight > 10      → #EF4444 (красный, "горячая")
```

---

## ROADMAP (обновлён)

### Фаза 1: Инфраструктура & Auth (week 1-2)
- [ ] Go проект (Gin, GORM, PostgreSQL+PostGIS)
- [ ] Google OAuth 2.0 + JWT
- [ ] Docker + docker-compose
- [ ] Базовые миграции

### Фаза 2: Cards & Markers API (week 2-4)
- [ ] CRUD карт (с полем radius и timezone)
- [ ] CRUD меток (с TTL, like_weight, цвет)
- [ ] Атомарные лайки/дизлайки
- [ ] Комментарии
- [ ] Firebase Storage (фото до 10MB, 5 на метку, удаление при delete)
- [ ] Rate limiting

### Фаза 3: Социальные функции (week 4-5)
- [ ] Подписки (на карту и юзера, дедупликация в ленте)
- [ ] Блокировка (с fingerprint)
- [ ] Жалобы (→ notify создателя)
- [ ] Лента активности

### Фаза 4: Геолокация & Уведомления (week 5-7)
- [ ] WebSocket real-time
- [ ] Geolocation API (выбор: GPS / ручной)
- [ ] Один push при входе в радиус нескольких меток
- [ ] FCM + Service Worker
- [ ] Toast для юзеров без push разрешения
- [ ] Cooldown на повторные уведомления

### Фаза 5: Frontend (week 7-10)
- [ ] Карта (Leaflet, Circle радиусы, кластеры)
- [ ] Цветовая система маркеров (like_weight → цвет)
- [ ] Обратный отсчёт TTL на метке
- [ ] Диалог при создании метки в радиусе другой
- [ ] Профили, поиск, лента

### Фаза 6: Полировка (week 10-11)
- [ ] Тесты
- [ ] Security audit
- [ ] Производительность (PostgreSQL индексы на геолокацию)
- [ ] Deployment
