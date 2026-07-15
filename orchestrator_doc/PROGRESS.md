# SNARK — Прогресс (hot state)

Горячий слой: ≤150 строк. Обновляется каждую сессию. Коммитится в `main` после сессии.
Лог сессий → [`LOG.md`](LOG.md). Детальная карта → [`archive/STATE-2026-07.md`](archive/STATE-2026-07.md).

Последнее обновление: 2026-07-15 (CORR)

## Архитектура

Монорепо `VasiliiLbyte/v0-project-snark` (`main`): **snark-portal** (Next.js :3000) + **snark-protocols** (FastAPI :8000), PostgreSQL / MinIO / Redis.
Prod portal: NSSM `snark-portal` на `192.168.1.236`. Оркестрация: `orchestrator_doc/`.
Порядок зависимостей: protocols API → portal UI/proxy → prod deploy.

## Текущая фаза

**Инициализация оркестратора + процессные правки (CORR)** — hot-state, NSSM runbook, блокер CI/SYNC-SERVER.

## Сделано (итог)

MVP портала live: auth, 33 страницы, 74 API routes, tasks/chat/protocols, 20 миграций, 12 vitest-файлов.
Оркестратор: хаб + executor rules + hot PROGRESS/LOG/archive (2026-07-15).
Детали → [`archive/STATE-2026-07.md`](archive/STATE-2026-07.md).

## Следующее

1. **SYNC-SERVER** (оператор): закоммитить/запушить серверные правки (README + NSSM/.bat) с `192.168.1.236` → `git pull` локально. **До этого — никаких DEP.**
2. **CI-ROOT** (executor `2026-07-15-02`): корневой `.github/workflows/ci.yml` — jobs portal + protocols, paths-filters; удалить мёртвый `services/protocols/.github/workflows/ci.yml`
3. Пометить `docs/launch-report.md` устаревшим или обновить
4. Сверить чекбоксы `docs/TZ_TASKS_CHAT_V2.md` с кодом
5. Python unit/integration тесты (`services/protocols/src/tests/`)
6. E2E с живым Postgres для ACL задач/чата
7. `/booking` — реализация (сейчас заглушка)
8. Service Desk v2: комментарии и вложения заявок
9. `GET /api/dashboard` + настраиваемые виджеты
10. Ответить на вопросы оператору в [`DEPLOY.md`](DEPLOY.md) §7

## Блокеры

| Блокер | Основание |
|--------|-----------|
| **CI отсутствует полностью** | Workflow в `services/protocols/.github/` не исполняется GitHub (не корень репо) |
| **SYNC-SERVER не выполнен** | Серверные NSSM-правки не запушены с прода; DEPLOY/README локально опережают git |
| Устаревшая документация | `launch-report.md` — state-routing era |
| Python protocols — внешние зависимости | ffmpeg, HF_TOKEN, STT/LLM ключи |
| Нет Python тестов | `def test_*` в protocols отсутствуют |
| Hybrid data layer | `portal-repository.drizzle.ts` делегирует часть в mock |

## Ожидает деплоя (Pending deploy)

**Правило:** никаких DEP до завершения SYNC-SERVER. Детали — [`DEPLOY.md`](DEPLOY.md).

| ID | Описание | Target | Статус | Дата |
|----|----------|--------|--------|------|
| — | Нет открытых DEP | — | — | — |
