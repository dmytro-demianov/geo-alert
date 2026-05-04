---
name: geo-alert project context
description: Ключевые технические решения и архитектура проекта geo-alert
type: project
originSessionId: d054382e-d8c2-4823-add9-12c0f1887fba
---
Веб-приложение для геолокационных меток на картах (Instagram + Google Maps + Waze).

**Why:** Пользователи создают карты, оставляют метки с медиа и тегами, подписываются на чужие карты, получают push при приближении к метке.

**Stack:** React + TypeScript (frontend), Go + Gin (backend), PostgreSQL + PostGIS, Firebase Storage (фото), Firebase Cloud Messaging (push), Google OAuth 2.0.

**Ключевые архитектурные решения:**
- Радиус задаётся на уровне Card (не Marker) — один радиус на всю карту
- like_weight = likes - dislikes (атомарный UPDATE, может быть отрицательным)
- Цвет маркера: <0=серый, 0-2=тёмно-серый, 3-5=жёлтый, 6-10=оранжевый, 10+=красный
- Browser fingerprint для обнаружения обходящих блокировку
- Часовой пояс END_OF_DAY — от создателя карты (Card.timezone)
- При удалении метки — уведомление юзерам в радиусе
- Один push при входе в радиус нескольких меток (батчинг)
- Без Redis в MVP

**How to apply:** При работе с кодом учитывать эти решения; не предлагать Redis без явного запроса.
