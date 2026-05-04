# EPIC-4: Геолокация & Уведомления

WebSocket real-time, геолокация, push-уведомления (FCM), TTL-воркер.

---

## TASK-4.1 `backend` WebSocket Real-time 🔲

- **TASK-4.1.1** 🔲 Настроить WebSocket endpoint `WS /ws` (`gorilla/websocket`) с JWT auth
- **TASK-4.1.2** 🔲 Connection manager: хранить активные connections в памяти (map[userID]conn)
- **TASK-4.1.3** 🔲 Broadcast при новом лайке: `{ type: "like_update", marker_id, like_weight }`
- **TASK-4.1.4** 🔲 Broadcast при новом комментарии: `{ type: "new_comment", marker_id, comment }`
- **TASK-4.1.5** 🔲 Heartbeat/ping-pong для поддержки соединения

## TASK-4.2 `backend` Геолокация API 🔲

- **TASK-4.2.1** 🔲 `POST /users/me/location` — обновить позицию (lat, lon, accuracy)
  - Если `accuracy > 100м` → вернуть `low_accuracy: true`
  - PostGIS запрос `ST_DWithin` для поиска меток в радиусе
  - Вернуть список `nearby_markers`
- **TASK-4.2.2** 🔲 `GET /feed/nearby?lat=&lon=&radius=` — метки рядом (для ручного режима)

## TASK-4.3 `backend` Push-уведомления (FCM) 🔲

- **TASK-4.3.1** 🔲 Настроить Firebase Admin SDK
- **TASK-4.3.2** 🔲 `POST /users/me/fcm-token` — сохранить FCM token
- **TASK-4.3.3** 🔲 Батчинг: если юзер входит в радиус нескольких меток → один push "Вы рядом с: X, Y, Z"
- **TASK-4.3.4** 🔲 Cooldown: хранить `last_notified_at` per (user_id, marker_id); повторное уведомление только после выхода и возврата
- **TASK-4.3.5** 🔲 Очищать FCM token при logout и delete account
- **TASK-4.3.6** 🔲 Обрабатывать ошибку `registration-token-not-registered` → удалять невалидные токены

## TASK-4.4 `backend` In-app Уведомления 🔲

- **TASK-4.4.1** 🔲 `GET /notifications` — список (новые сверху, пагинация)
- **TASK-4.4.2** 🔲 `PUT /notifications/:id/read` — прочитать
- **TASK-4.4.3** 🔲 `DELETE /notifications` — очистить все
- **TASK-4.4.4** 🔲 Сервис создания уведомлений при событиях: новая метка, лайк, комментарий, подписка, жалоба, смена privacy, удаление метки
- **TASK-4.4.5** 🔲 Cron: автоудаление уведомлений старше 30 дней

## TASK-4.5 `backend` TTL Background Worker 🔲

- **TASK-4.5.1** 🔲 Background goroutine — каждую минуту: найти метки с `expires_at <= now() AND deleted_at IS NULL`
- **TASK-4.5.2** 🔲 Soft delete истёкших → cascade: удалить лайки, комментарии
- **TASK-4.5.3** 🔲 Удалить фото из Firebase Storage для истёкших меток
- **TASK-4.5.4** 🔲 Декрементировать `cards.marker_count`
