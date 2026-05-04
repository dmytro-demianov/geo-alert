# EPIC-3: Социальные функции

Подписки, блокировки, лента активности, поиск, профили.

---

## TASK-3.1 `backend` Подписки 🔲

- **TASK-3.1.1** 🔲 `POST /subscriptions` — подписаться на карту или юзера
  - Проверить: карта не PRIVATE; юзер не заблокирован
  - Инкрементировать `cards.subscriber_count`
- **TASK-3.1.2** 🔲 `DELETE /subscriptions/:id` — отписаться (декремент `subscriber_count`)
- **TASK-3.1.3** 🔲 `GET /me/subscriptions` — список подписок (раздельно: карты и юзеры)

## TASK-3.2 `backend` Блокировка 🔲

- **TASK-3.2.1** 🔲 `POST /users/:id/block` — заблокировать юзера (USER_BLOCK + сохранить fingerprint + удалить его подписки)
- **TASK-3.2.2** 🔲 `POST /cards/:id/block` — заблокировать юзера для карты (CARD_BLOCK, только owner)
- **TASK-3.2.3** 🔲 `DELETE /users/:id/block` — разблокировать
- **TASK-3.2.4** 🔲 `DELETE /cards/:id/block` — разблокировать для карты
- **TASK-3.2.5** 🔲 `GET /me/blocked` — список заблокированных
- **TASK-3.2.6** 🔲 Middleware `BlockCheck` — на всех запросах проверять блокировку → `403`
- **TASK-3.2.7** 🔲 Auto-block при fingerprint совпадении: при логине проверять fingerprint нового юзера против всех `blocked_fingerprints[]`

## TASK-3.3 `backend` Профили 🔲

- **TASK-3.3.1** 🔲 `GET /users/:id` — профиль (display_name, avatar, bio, счётчики, карты; удалённый → заглушка)
- **TASK-3.3.2** 🔲 `PUT /users/me` — редактировать профиль (display_name, bio, avatar_url)
- **TASK-3.3.3** 🔲 `DELETE /users/me` — soft delete + cascade карты/метки/лайки + очистить FCM token

## TASK-3.4 `backend` Лента активности 🔲

- **TASK-3.4.1** 🔲 `GET /feed` — новые метки от подписок (cursor paging, сортировка по активности)
- **TASK-3.4.2** 🔲 Дедупликация: если подписан на юзера И его карту → одна запись (карта приоритетнее)
- **TASK-3.4.3** 🔲 Фильтрация: скрывать метки от заблокированных; скрывать истёкшие

## TASK-3.5 `backend` Поиск 🔲

- **TASK-3.5.1** 🔲 `GET /search?type=markers&q=` — полнотекстовый поиск (title + description), фильтр по тегам, сортировка
- **TASK-3.5.2** 🔲 `GET /search?type=cards&q=` — поиск PUBLIC карт
- **TASK-3.5.3** 🔲 `GET /search?type=users&q=` — поиск по display_name (без удалённых)
