# Валидация workflow оркестратора (2026-07-15)

Первая тестовая итерация: стартовый промпт → executor prompt → verify → update PROGRESS.

---

## 1. Стартовый промпт (оркестратор)

```
Ты — оркестратор SNARK. Прочитай в корне workspace:
- PROGRESS.md
- LOG.md (последняя запись)
- SPEC.md (если меняется логика)
- ORCHESTRATOR.md
Продолжи с «Следующее» в PROGRESS. Не пиши код в этом чате — готовь промпты для Plan mode.
```

**Результат:** первый пункт P0 — синхронизация `docs/phase2-app-router-dod.md`.

---

## 2. Executor prompt `2026-07-15-01`

## SNARK Executor — [ID: 2026-07-15-01]

**Target:** snark-portal  
**Путь:** /Users/vasilii/Desktop/code /v0-project-snark-1  
**Связь с платформой:** PROGRESS.md → «Следующее» → P0 документация

### Цель
Обновить `docs/phase2-app-router-dod.md`: отметить выполненные пункты DoD фазы 2 по фактическому коду.

### Контекст
- App Router реализован: 33 страницы в `(main)/`, `app/page.tsx` → redirect.
- `middleware.ts` — JWT + admin guard.
- `components/sidebar.tsx` — Link + usePathname.
- Repository layer в `lib/repositories/`.
- Тесты: `tests/home.smoke.test.tsx`, `tests/auth/login.e2e.test.tsx`.

### Файлы
- `docs/phase2-app-router-dod.md`

### НЕ трогать
- Код приложения
- `launch-report.md` (отдельная задача)

### Критерии готовности
- [x] Чекбоксы `[x]` для выполненных пунктов
- [x] `[ ]` только для реально открытых пунктов с пояснением
- [x] Дата синхронизации в шапке документа

### Проверка
Read-only verify: сверка с `app/page.tsx`, `middleware.ts`, `components/sidebar.tsx`, `lib/repositories/`, tests.

### Отчёт оркестратору
- 1 файл изменён
- Verify: grep/read подтверждает критерии
- Follow-up: `launch-report.md`, TZ_TASKS_CHAT_V2 чекбоксы

---

## 3. Verify (оркестратор)

| Критерий | Статус |
|----------|--------|
| `app/page.tsx` — redirect only | OK |
| `middleware.ts` — admin roles | OK |
| `sidebar.tsx` — Link + pathname | OK |
| `lib/repositories/` exists | OK |
| hooks `isLoading/error/refetch` | OK (contacts, documents, dashboard, profile) |
| smoke + login e2e tests | OK |
| DoD file updated | OK |

---

## 4. Итог

Workflow **валидирован**. Следующие промпты выдавать по шаблону [ORCHESTRATOR.md](ORCHESTRATOR.md) §4.
