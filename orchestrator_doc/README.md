# SNARK — Хаб оркестратора разработки

Память проекта, playbook и контракты для чата-оркестратора. Код приложения **не пишется здесь** — только планирование, промпты для исполнителей и обновление документации после verify.

Паттерн: [muru-docs](https://github.com/VasiliiLbyte/muru-docs) (MURU).

---

## Как работать

| Роль | Cursor workspace | Режим |
|------|------------------|-------|
| **Оркестратор** | `orchestrator_doc/` (эта папка) | Обычный чат, rule `60-orchestrator.mdc` |
| **Исполнитель portal** | `v0-project-snark-1/` (корень репо) | Plan mode, rule `55-executor-portal.mdc` |
| **Исполнитель protocols** | `v0-project-snark-1/services/protocols/` | Plan mode, rule `55-executor-protocols.mdc` |

### Старт новой сессии оркестратора

```
Ты — оркестратор SNARK. Прочитай в корне workspace:
- PROGRESS.md
- LOG.md (последняя запись)
- SPEC.md (если меняется логика)
- ORCHESTRATOR.md
Продолжи с «Следующее» в PROGRESS. Не пиши код в этом чате — готовь промпты для Plan mode.
```

---

## Документы

| Файл | Назначение |
|------|------------|
| [ORCHESTRATOR.md](ORCHESTRATOR.md) | Playbook: роли, loop, шаблоны промптов |
| [PROGRESS.md](PROGRESS.md) | Hot state: фаза, следующее, блокеры, pending deploy (≤150 строк) |
| [LOG.md](LOG.md) | Лог сессий (append-only, новые сверху) |
| [archive/STATE-2026-07.md](archive/STATE-2026-07.md) | Карта состояния «Сделано» (редко меняется) |
| [SPEC.md](SPEC.md) | Живое ТЗ + triage v2 |
| [API_CONTRACT.md](API_CONTRACT.md) | Контракт portal ↔ Python protocols |
| [DEPLOY.md](DEPLOY.md) | Runbook выкатки (local + Windows prod) |
| [VALIDATION.md](VALIDATION.md) | Первая валидация workflow (2026-07-15) |

### Детальные ТЗ (в репозитории, не дублируем)

- [`../docs/TZ_MODULES_SNARK.md`](../docs/TZ_MODULES_SNARK.md) — модули портала
- [`../docs/TZ_TASKS_CHAT_V2.md`](../docs/TZ_TASKS_CHAT_V2.md) — задачи и чат

---

## Карта репозитория

```
/Users/vasilii/Desktop/code /v0-project-snark-1/
├── orchestrator_doc/     ← вы здесь (хаб)
├── app/                  ← snark-portal (Next.js)
├── services/protocols/   ← snark-protocols (Python)
└── docs/                 ← детальные ТЗ
```

**Порядок при зависимостях:** `snark-protocols` (API) → `snark-portal` (UI/proxy) → prod deploy.

---

*Обновляйте PROGRESS после каждой проверенной сессии. Подробности — [ORCHESTRATOR.md](ORCHESTRATOR.md).*
