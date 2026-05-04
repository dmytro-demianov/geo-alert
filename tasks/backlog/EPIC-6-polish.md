# EPIC-6: Полировка & Deployment

Тесты, оптимизация БД, security audit, деплой.

---

## TASK-6.1 `backend` Тесты Backend 🔲

- **TASK-6.1.1** 🔲 Unit тесты handlers: auth, cards, markers, likes, comments
- **TASK-6.1.2** 🔲 Unit тесты сервисов: TTL-логика, like_weight, fingerprint matching
- **TASK-6.1.3** 🔲 Integration тесты: полный flow создание карты → метка → лайк → комментарий
- **TASK-6.1.4** 🔲 Тест race condition лайков: параллельные запросы → `like_weight` корректен
- **TASK-6.1.5** 🔲 Тест optimistic locking: одновременное редактирование метки → один получает `409`

## TASK-6.2 `frontend` Тесты Frontend 🔲

- **TASK-6.2.1** 🔲 Unit тесты компонентов (Vitest + Testing Library): форма метки, TTL таймер, цветовая система
- **TASK-6.2.2** 🔲 E2E тесты (Playwright): создание карты/метки, подписка, блокировка

## TASK-6.3 `backend` PostgreSQL Оптимизация 🔲

- **TASK-6.3.1** 🔲 GIST индекс на `markers.location` (ST_DWithin)
- **TASK-6.3.2** 🔲 Partial index на `markers.deleted_at IS NULL`
- **TASK-6.3.3** 🔲 Partial index на `markers.expires_at` для TTL-воркера
- **TASK-6.3.4** 🔲 `EXPLAIN ANALYZE` на: лента, поиск, геолокация
- **TASK-6.3.5** 🔲 Connection pooling: настроить `pgxpool`

## TASK-6.4 `backend` Security Audit 🔲

- **TASK-6.4.1** 🔲 CORS: разрешить только домен фронтенда
- **TASK-6.4.2** 🔲 Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`
- **TASK-6.4.3** 🔲 Все SQL запросы параметризованы (нет конкатенации)
- **TASK-6.4.4** 🔲 Input validation через `go-playground/validator`
- **TASK-6.4.5** 🔲 JWT: проверить алгоритм, expiry, revocation
- **TASK-6.4.6** 🔲 File upload: проверять magic bytes фото

## TASK-6.5 `ops` Deployment 🔲

- **TASK-6.5.1** 🔲 Production Dockerfile (distroless или alpine)
- **TASK-6.5.2** 🔲 Frontend build + деплой (Vercel/Netlify)
- **TASK-6.5.3** 🔲 Backend деплой (AWS EC2 / DigitalOcean)
- **TASK-6.5.4** 🔲 PostgreSQL managed hosting (Neon / Supabase / RDS)
- **TASK-6.5.5** 🔲 CI/CD pipeline (GitHub Actions): push → build → тесты → деплой
- **TASK-6.5.6** 🔲 Sentry (backend + frontend)
- **TASK-6.5.7** 🔲 Domain + SSL (Cloudflare / Let's Encrypt)
- **TASK-6.5.8** 🔲 Проверить: никаких секретов в коде
