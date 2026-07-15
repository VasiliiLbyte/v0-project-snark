# Фаза 2 — Definition of Done

> Синхронизировано с кодом: 2026-07-15 (промпт оркестратора `2026-07-15-01`).

## Маршруты и layout

- [x] Маршруты `dashboard`, `contacts`, `documents`, `profile` открываются как файловые маршруты App Router (`app/(main)/*/page.tsx`).
- [x] В защищённой зоне используется только один layout: `app/(main)/layout.tsx`.
- [x] `app/page.tsx` не содержит state-based роутинг — только `redirect("/dashboard")`.

## Авторизация и роли

- [x] Middleware применяет проверку сессии ко всем защищённым маршрутам (`middleware.ts`).
- [x] Маршрут `/admin` доступен только ролям `admin` и `hr_manager` (`middleware.ts`).
- [x] Навигация может скрывать пункты по роли, но security-граница остаётся в middleware.

## Навигация App Router

- [x] Sidebar использует `Link` для переходов между маршрутами (`components/sidebar.tsx`).
- [x] Активный пункт меню определяется через `usePathname()`.
- [x] Обновление страницы не ломает активное состояние пункта меню (file-based routes).

## Server/Client границы

- [x] Route-level `page.tsx` используют server-first загрузку данных (основные разделы).
- [x] Интерактивные компоненты (поиск, фильтры, tabs, модалки) остались клиентскими.
- [ ] Нет hydration mismatch после разделения server/client — **требует периодической ручной проверки** при изменениях UI.

## Контракт данных и будущие API

- [x] Используется слой `repository` для доступа к данным (`lib/repositories/`).
- [x] Для ключевых доменов подготовлены hooks: `data`, `isLoading`, `error`, `refetch` (`use-contacts`, `use-documents`, `use-dashboard`, `use-profile`, …).
- [x] Подготовлены типы и mapper-слой (`portal-repository.drizzle.ts`, `portal-repository.mock.ts`).
- [ ] Полный отказ от mock fallback в `portal-repository.drizzle.ts` — **follow-up** (см. PROGRESS).

## Тесты и валидация

- [x] Smoke-сценарии покрывают базовый рендер основных разделов (`tests/home.smoke.test.tsx`).
- [x] Сценарий `login -> protected route -> dashboard` проходит (`tests/auth/login.e2e.test.tsx`).
- [x] Прямой вход на защищённые страницы без сессии ведёт на `/login` (middleware + auth tests).

## Итог фазы 2

**Закрыто:** App Router, auth, sidebar, repository layer, базовые smoke/e2e тесты.

**Открыто:** hydration regression checks, полное отключение mock fallback, расширение smoke на `chat`/`tasks`/`protocols`.
