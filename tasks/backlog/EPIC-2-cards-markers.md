# EPIC-2: Cards & Markers API

CRUD для карт и геометок, лайки, комментарии, загрузка фото.

---

## TASK-2.1 `backend` Cards CRUD 🔲

- **TASK-2.1.1** 🔲 `POST /cards` — создать карту (title, description, privacy, allow_contributors, radius, timezone)
- **TASK-2.1.2** 🔲 `GET /cards/:id` — детали карты (проверить доступ + блокировку)
- **TASK-2.1.3** 🔲 `PUT /cards/:id` — обновить карту (только owner; при смене на PRIVATE уведомить подписчиков)
- **TASK-2.1.4** 🔲 `DELETE /cards/:id` — soft delete + cascade markers/likes/comments/subscriptions
- **TASK-2.1.5** 🔲 `GET /users/:id/cards` — публичные карты юзера (для себя — все включая PRIVATE)

## TASK-2.2 `backend` Markers CRUD 🔲

- **TASK-2.2.1** 🔲 `POST /cards/:id/markers` — создать метку
  - **TASK-2.2.1.1** 🔲 Проверка прав: owner карты или (allow_contributors + подписчик)
  - **TASK-2.2.1.2** 🔲 Сохранить PostGIS geometry: `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`
  - **TASK-2.2.1.3** 🔲 Логика TTL: вычислить `expires_at` по `expiration_type` (PERIOD/END_OF_DAY/UNTIL_TIME/ETERNAL)
  - **TASK-2.2.1.4** 🔲 Найти метки в радиусе `card.radius` → вернуть в ответе как `nearby_markers`
  - **TASK-2.2.1.5** 🔲 Инкрементировать `cards.marker_count`
- **TASK-2.2.2** 🔲 `GET /markers/:id` — детали метки (инкрементировать view_count; скрыть view_count от не-авторов)
- **TASK-2.2.3** 🔲 `PUT /markers/:id` — обновить метку
  - **TASK-2.2.3.1** 🔲 Только `created_by`
  - **TASK-2.2.3.2** 🔲 Optimistic locking через `updated_at` → `409 Conflict` при конфликте
  - **TASK-2.2.3.3** 🔲 Продление TTL: пересчитать `expires_at`
  - **TASK-2.2.3.4** 🔲 Запрет продления истёкшей метки
- **TASK-2.2.4** 🔲 `DELETE /markers/:id` — soft delete + уведомить юзеров в радиусе + декремент `marker_count`
- **TASK-2.2.5** 🔲 `GET /cards/:id/markers` — список с фильтрами
  - **TASK-2.2.5.1** 🔲 Поиск по `q` (title + description)
  - **TASK-2.2.5.2** 🔲 Фильтр по `tags[]` (OR логика)
  - **TASK-2.2.5.3** 🔲 Сортировка: `newest | oldest | popular`
  - **TASK-2.2.5.4** 🔲 Cursor-based пагинация
  - **TASK-2.2.5.5** 🔲 Скрывать истёкшие по умолчанию (`?include_expired=true` — опционально)

## TASK-2.3 `backend` Лайки / Дизлайки 🔲

- **TASK-2.3.1** 🔲 `POST /markers/:id/likes` — like/dislike/remove (toggle)
- **TASK-2.3.2** 🔲 Атомарный UPDATE `like_weight` через `INSERT ON CONFLICT + пересчёт`
- **TASK-2.3.3** 🔲 Проверить `allow_likes = true`
- **TASK-2.3.4** 🔲 Broadcast обновлённого `like_weight` через WebSocket

## TASK-2.4 `backend` Комментарии 🔲

- **TASK-2.4.1** 🔲 `GET /markers/:id/comments` — список (новые сверху, пагинация)
- **TASK-2.4.2** 🔲 `POST /markers/:id/comments` — добавить (проверить `allow_comments`; парсить `@mentions`; уведомить автора метки и упомянутых)
- **TASK-2.4.3** 🔲 `DELETE /comments/:id` — автор комментария или owner карты

## TASK-2.5 `backend` Просмотры 🔲

- **TASK-2.5.1** 🔲 `POST /markers/:id/views` — записать просмотр (дедупликация per session)
- **TASK-2.5.2** 🔲 `view_count` в ответе — только для `created_by`

## TASK-2.6 `backend` Firebase Storage (Фото) 🔲

- **TASK-2.6.1** 🔲 Настроить Firebase Admin SDK в Go
- **TASK-2.6.2** 🔲 `POST /upload/photo` — загрузить фото (image/jpeg|png|webp, макс. 10MB, UUID имя файла)
- **TASK-2.6.3** 🔲 При `DELETE /markers/:id` — удалить все фото из Firebase Storage

## TASK-2.7 `backend` Жалобы 🔲

- **TASK-2.7.1** 🔲 `POST /markers/:id/reports` — один юзер один раз; создать уведомление для owner карты
- **TASK-2.7.2** 🔲 Owner карты сам решает что делать после получения уведомления
