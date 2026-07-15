# SNARK — Прогресс (hot state)

Горячий слой: ≤150 строк. Обновляется каждую сессию. Коммитится в `main` после сессии.
Лог сессий → [`LOG.md`](LOG.md). Детальная карта → [`archive/STATE-2026-07.md`](archive/STATE-2026-07.md).

Последнее обновление: 2026-07-15 (CI-ROOT verified)

## Архитектура

Монорепо `VasiliiLbyte/v0-project-snark` (`main`): **snark-portal** (Next.js :3000) + **snark-protocols** (FastAPI :8000), PostgreSQL / MinIO / Redis.
Prod portal: NSSM `snark-portal` на `192.168.1.236`. Оркестрация: `orchestrator_doc/`.
CI: корневой [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (portal + protocols, paths-filter).
Порядок зависимостей: protocols API → portal UI/proxy → prod deploy.

## Текущая фаза

**Процессные правки (CORR + CI-ROOT)** — hot-state, NSSM runbook, CI live. Остаётся SYNC-SERVER.

## Сделано (итог)

MVP портала live: auth, 33 страницы, 74 API routes, tasks/chat/protocols, 20 миграций.
Оркестратор: хаб + hot PROGRESS/LOG/archive (2026-07-15).
**CI-ROOT** `dce5861`: корневой workflow, мёртвый nested CI удалён; GitHub run [#29410282859](https://github.com/VasiliiLbyte/v0-project-snark/actions/runs/29410282859) — portal + protocols OK.
Детали → [`archive/STATE-2026-07.md`](archive/STATE-2026-07.md).

## Следующее

1. **SYNC-SERVER** (оператор): закоммитить/запушить серверные правки (README + NSSM/.bat) с `192.168.1.236` → `git pull` локально. **До этого — никаких DEP.**
2. Пометить `docs/launch-report.md` устаревшим или обновить
3. Сверить чекбоксы `docs/TZ_TASKS_CHAT_V2.md` с кодом
4. Python unit/integration тесты (`services/protocols/src/tests/`)
5. E2E с живым Postgres для ACL задач/чата
6. `/booking` — реализация (сейчас заглушка)
7. Service Desk v2: комментарии и вложения заявок
8. `GET /api/dashboard` + настраиваемые виджеты
9. Ответить на вопросы оператору в [`DEPLOY.md`](DEPLOY.md) §7

## Блокеры

| Блокер | Основание |
|--------|-----------|
| **SYNC-SERVER не выполнен** | Серверные NSSM-правки не запушены с прода; DEPLOY/README локально опережают git |
| Устаревшая документация | `launch-report.md` — state-routing era |
| Python protocols — внешние зависимости | ffmpeg, HF_TOKEN, STT/LLM ключи |
| Нет Python тестов | `def test_*` в protocols отсутствуют (CI pytest exit 5 — OK) |
| Hybrid data layer | `portal-repository.drizzle.ts` делегирует часть в mock |

## Ожидает деплоя (Pending deploy)

**Правило:** никаких DEP до завершения SYNC-SERVER. Детали — [`DEPLOY.md`](DEPLOY.md).

| ID | Описание | Target | Статус | Дата |
|----|----------|--------|--------|------|
| — | Нет открытых DEP | — | — | — |
