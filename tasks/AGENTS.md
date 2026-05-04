# Агенты

## Роли

| Агент | Специализация | Эпики |
|-------|--------------|-------|
| `backend` | Go, Gin, PostgreSQL, PostGIS, миграции, API endpoints | EPIC-1 (кроме docker), EPIC-2, EPIC-3, EPIC-4, EPIC-6 (кроме deployment) |
| `frontend` | React, TypeScript, Tailwind, Leaflet, PWA | EPIC-5, EPIC-6.2 |
| `ops` | Docker, docker-compose, CI/CD, деплой, мониторинг | EPIC-1.2, EPIC-6.5 |

---

## Правило: один экземпляр на роль

**Каждая роль может быть занята только одним агентом одновременно.**

Если агент запускается и видит что роль `backend` уже занята (поле `active_agents.backend` в `BOARD.json`), он **не берёт задачи `backend`**, а берёт свободную роль из оставшихся.

### Приоритет при выборе свободной роли

```
backend → frontend → ops
```

Пример: запущено два агента одновременно.
- Первый агент: видит все роли свободны → берёт `backend`
- Второй агент: видит `backend` занят → берёт `frontend`
- Третий агент: видит `backend` и `frontend` заняты → берёт `ops`
- Четвёртый агент: все роли заняты → ждёт или сообщает что нечего делать

---

## Протокол старта агента

```
1. Попытаться создать файл tasks/BOARD.lock (эксклюзивно, с таймаутом 30 сек)
   — если файл уже существует и его mtime > 30 сек назад → считать lock зависшим,
     удалить и пересоздать
2. Прочитать BOARD.json → поле active_agents
3. Проверить heartbeat каждой занятой роли:
   — если last_heartbeat_at роли > 5 минут назад → считать агента зависшим,
     освободить роль (active_agents.<role> = null), сбросить его задачи в "todo"
4. Найти свободную роль (приоритет: backend → frontend → ops)
5. Если свободной роли нет → освободить lock, сообщить "все роли заняты"
6. Записать себя в active_agents:
   {
     "agent_id": "agent-<id>",
     "started_at": "<ISO8601>",
     "last_heartbeat_at": "<ISO8601>"
   }
7. Освободить tasks/BOARD.lock
8. Начать брать задачи своей роли
```

## Протокол взятия задачи

```
1. Прочитать BOARD.json
2. Найти задачи:
   — поле agent = моя роль
   — status = "todo"
   — все depends_on имеют status = "done" или "merged"
3. Проверить лимит: уже взятых мной задач в статусе "in_progress" < config.max_parallel_tasks
4. Захватить tasks/BOARD.lock
5. Обновить задачу: status → "in_progress", agent_instance → "<id>", started_at → now
6. Освободить tasks/BOARD.lock
7. git checkout -b feature/TASK-X.X
8. Выполнить задачу
9. Захватить lock → status → "done", done_at → now → освободить lock
10. Смёрджить ветку в main
11. Захватить lock → status → "merged", merged_at → now → освободить lock
```

## Протокол heartbeat

```
— Каждые 60 секунд (config.heartbeat_interval_seconds) записывать в BOARD.json:
  active_agents.<моя_роль>.last_heartbeat_at = now()
— Захватывать lock только на время записи (< 1 сек)
— Если агент упал без обновления heartbeat — другой агент обнаружит это при старте
  (п. 3 протокола старта) и освободит роль
```

## Протокол завершения работы агента

```
1. Захватить tasks/BOARD.lock
2. Удалить себя из active_agents (установить null)
3. Освободить tasks/BOARD.lock
```

---

## Статусы задачи

```
todo        — задача не взята
in_progress — агент работает (есть agent_instance и started_at)
done        — код написан, ветка НЕ смёрджена в main
merged      — ветка смёрджена в main (финальный статус; зависимые задачи разблокируются)
failed      — агент упал с ошибкой
```

**Зависимые задачи разблокируются только когда dependency имеет статус `merged`, не `done`.**

Это предотвращает ситуацию, когда следующий агент начинает работу на основе кода, который ещё не попал в `main`.

---

## Правила параллельной работы

- **Один агент = одна роль** — нельзя брать задачи чужой роли
- **Нет дублирования ролей** — если роль занята, берёшь следующую свободную
- **Лимит параллельных задач** — не более `config.max_parallel_tasks` (= 3) задач одновременно
- Агент берёт задачи только с выполненными зависимостями (`merged`)
- Упал с ошибкой → выставить `status: "failed"`, записать причину в `error`, освободить роль из `active_agents`

---

## Сценарии восстановления после сбоев

### 1. Зависший BOARD.lock

Если файл `tasks/BOARD.lock` существует, но его `mtime` старше `config.lock_ttl_seconds` (30 сек) — считать lock зависшим.

```
Действие: удалить BOARD.lock и создать заново
Причина: предыдущий агент упал, не успев освободить lock
```

### 2. Зависшая задача in_progress

При старте проверять все задачи в `in_progress`:
- Если `now() - started_at > config.in_progress_timeout_hours` (4 часа) → задача зависла

```
Действие: status → "todo", agent_instance → null, error → "timeout reset by agent-<id>"
Причина: агент упал в середине работы
Важно: записать в progress_notes что было сделано до сброса (если известно)
```

### 3. Зависший агент в active_agents

При старте проверять `active_agents`:
- Если `last_heartbeat_at` роли старше 5 минут → агент мёртв

```
Действие:
  1. active_agents.<role> = null
  2. Все задачи этого agent_instance в "in_progress" → сбросить в "todo"
  3. Взять освободившуюся роль себе
```

### 4. Статус done без merge

Задача в `done` — это код в ветке, но не в `main`. Зависимые задачи **не разблокируются**.

```
Действие агента при завершении задачи:
  1. Написать код → status: "done"
  2. git merge feature/TASK-X.X → main
  3. status: "merged", merged_at: now()
Только после этого зависимые задачи становятся доступными.
```

### 5. Frontend заблокирован ожиданием backend API

Frontend-агент не должен стоять в ожидании backend. При отсутствии реального API:

```
Действие:
  1. Использовать mock-данные: tasks/mock-api.yaml (OpenAPI spec с примерами ответов)
  2. Реализовать UI полностью на моках
  3. Добавить в progress_notes: "реализовано на моках, нужно подключить к <TASK-X.X>"
  4. После завершения backend-задачи — выполнить подключение отдельной задачей
```

`tasks/mock-api.yaml` содержит все endpoint'ы с примерами ответов и должен поддерживаться backend-агентом актуальным.

### 6. Git конфликты из-за ENV переменных

Чтобы избежать конфликтов в конфигурационных файлах:

```
Правила:
  — Все переменные окружения определяются в .env.example в начале TASK-1.1
  — Каждый агент добавляет свои переменные только в .env.example через PR
  — Никаких захардкоженных значений в коде
  — Имена переменных:
      AUTH_*       — Google OAuth, JWT
      DB_*         — PostgreSQL
      FIREBASE_*   — Firebase Storage, FCM
      SERVER_*     — порт, хост
      RATE_LIMIT_* — лимиты
```

При конфликте: merge с сохранением обеих переменных (они не перекрываются при соблюдении префиксов).

### 7. Слишком много параллельных задач

Лимит `config.max_parallel_tasks = 3` на агента.

```
Проверка при взятии задачи:
  count(мои задачи в in_progress) >= max_parallel_tasks → не брать новую задачу
Логика: сначала закончи текущие, потом берись за новые
```

### 8. Нет механизма отката при падении на середине

Перед началом каждой задачи фиксировать точку восстановления:

```
При взятии задачи → записать в progress_notes начальное состояние:
  "started: <описание что будет сделано>"

В процессе работы обновлять progress_notes:
  "done: создал миграции; in_progress: пишу handlers"

При падении → другой агент видит progress_notes и знает с какого места продолжать
  или что нужно откатить

При сбросе зависшей задачи → progress_notes НЕ очищать (сохранить для диагностики)
```

---

## Переменные окружения (зафиксированные имена)

```env
# Auth (TASK-1.4)
AUTH_GOOGLE_CLIENT_ID=
AUTH_GOOGLE_CLIENT_SECRET=
AUTH_JWT_SECRET=
AUTH_JWT_EXPIRY_HOURS=24

# Database (TASK-1.3)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=geo_alert
DB_USER=
DB_PASSWORD=
DB_MAX_CONNECTIONS=20

# Firebase (TASK-2.6, TASK-4.3)
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_SERVICE_ACCOUNT_JSON=

# Server
SERVER_PORT=8080
SERVER_ENV=development

# Rate Limiting (TASK-1.5)
RATE_LIMIT_MARKERS_PER_HOUR=20
RATE_LIMIT_LIKES_PER_HOUR=100
RATE_LIMIT_COMMENTS_PER_HOUR=50
RATE_LIMIT_GLOBAL_PER_HOUR=1000
```
