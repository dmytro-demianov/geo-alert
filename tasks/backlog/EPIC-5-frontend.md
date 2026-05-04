# EPIC-5: Frontend

React + TypeScript приложение: карта, создание меток, социальные функции, уведомления.

---

## TASK-5.1 `frontend` Инициализация проекта 🔲

- **TASK-5.1.1** 🔲 Vite + React + TypeScript
- **TASK-5.1.2** 🔲 Tailwind CSS
- **TASK-5.1.3** 🔲 React Router v6
- **TASK-5.1.4** 🔲 HTTP-клиент (axios) с interceptors для JWT auto-refresh
- **TASK-5.1.5** 🔲 WebSocket клиент
- **TASK-5.1.6** 🔲 Global state (Zustand)

## TASK-5.2 `frontend` Auth UI 🔲

- **TASK-5.2.1** 🔲 Страница `/login` с кнопкой "Sign in with Google"
- **TASK-5.2.2** 🔲 OAuth callback: сохранить JWT, protected routes
- **TASK-5.2.3** 🔲 Кнопка Logout

## TASK-5.3 `frontend` Карта (Leaflet) 🔲

- **TASK-5.3.1** 🔲 Базовая карта (`react-leaflet` + OpenStreetMap)
- **TASK-5.3.2** 🔲 Отображение маркеров (кастомные иконки)
- **TASK-5.3.3** 🔲 Цветовая система маркеров по `like_weight`: `<0` серый → `0-2` тёмно-серый → `3-5` жёлтый → `6-10` оранжевый → `>10` красный
- **TASK-5.3.4** 🔲 Круги радиуса (`Leaflet.Circle`)
- **TASK-5.3.5** 🔲 Кластеризация маркеров (`leaflet.markercluster`)
- **TASK-5.3.6** 🔲 Синий пульсирующий маркер текущей позиции юзера
- **TASK-5.3.7** 🔲 Индикатор точности GPS: если accuracy > 100м — предупреждение
- **TASK-5.3.8** 🔲 Переключатель "GPS / Ручной выбор"

## TASK-5.4 `frontend` Управление картами UI 🔲

- **TASK-5.4.1** 🔲 Страница "Мои карты"
- **TASK-5.4.2** 🔲 Форма создания карты (title, description, privacy, allow_contributors, radius-слайдер, timezone)
- **TASK-5.4.3** 🔲 Страница карты: карта + список меток сбоку
- **TASK-5.4.4** 🔲 Confirmation dialog при смене privacy

## TASK-5.5 `frontend` Создание/редактирование метки UI 🔲

- **TASK-5.5.1** 🔲 Клик на карту → форма создания с координатами
- **TASK-5.5.2** 🔲 Поля: title, description, фото upload (drag&drop, 5 × 10MB), tags, TTL picker, настройки
- **TASK-5.5.3** 🔲 Диалог "В радиусе уже есть метка" (кнопки: Посмотреть / Лайкнуть / Комментировать / Создать свою)
- **TASK-5.5.4** 🔲 Обратный отсчёт TTL на карточке (красный при < 10 мин, анимация при истечении)

## TASK-5.6 `frontend` Детали метки UI 🔲

- **TASK-5.6.1** 🔲 Drawer/modal: галерея фото, title, description, теги
- **TASK-5.6.2** 🔲 Кнопки лайк/дизлайк с real-time счётчиком (WebSocket)
- **TASK-5.6.3** 🔲 Комментарии: список + форма + @mention autocomplete + удаление своего
- **TASK-5.6.4** 🔲 Кнопка "Пожаловаться"
- **TASK-5.6.5** 🔲 `view_count` — только для автора метки

## TASK-5.7 `frontend` Социальные функции UI 🔲

- **TASK-5.7.1** 🔲 Страница профиля: аватар, имя, bio, счётчики, карты
- **TASK-5.7.2** 🔲 Кнопки Подписаться / Отписаться / Заблокировать
- **TASK-5.7.3** 🔲 Форма блокировки: выбор "Карту" или "Юзера"
- **TASK-5.7.4** 🔲 Страница настроек → список заблокированных с разблокировкой

## TASK-5.8 `frontend` Лента активности UI 🔲

- **TASK-5.8.1** 🔲 Страница `/feed`: infinite scroll
- **TASK-5.8.2** 🔲 Карточка метки: превью фото, title, карта-источник, time ago, лайки/комментарии
- **TASK-5.8.3** 🔲 Клик → детали метки

## TASK-5.9 `frontend` Поиск UI 🔲

- **TASK-5.9.1** 🔲 Строка поиска в header
- **TASK-5.9.2** 🔲 Результаты по табам: Метки / Карты / Юзеры
- **TASK-5.9.3** 🔲 Фильтры: теги (multi-select), сортировка

## TASK-5.10 `frontend` Уведомления UI + PWA 🔲

- **TASK-5.10.1** 🔲 Колокольчик в header с бейджем непрочитанных
- **TASK-5.10.2** 🔲 Дропдаун уведомлений: список, mark as read, clear all
- **TASK-5.10.3** 🔲 Toast уведомления (без push разрешения)
- **TASK-5.10.4** 🔲 Service Worker: запросить разрешение, обработать push, при клике открыть страницу
- **TASK-5.10.5** 🔲 PWA: `manifest.json`, иконки, `offline.html`
