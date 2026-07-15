# SNARK — Deploy Runbook

Карта окружений и команды выкатки. Связь с **Pending deploy** в [`PROGRESS.md`](PROGRESS.md) (`DEP-xxx`).

**Важно:** никаких DEP до завершения **SYNC-SERVER** (см. PROGRESS P0).

---

## 1. Карта окружений

| Окружение | ОС | Портал | Protocols | БД / S3 / Redis |
|-----------|-----|--------|-----------|-----------------|
| **Local dev** | macOS / Windows | `pnpm dev` :3000 | uvicorn :8000 + Celery | Docker Compose |
| **Production** | Windows Server `192.168.1.236` | NSSM `snark-portal` | Python API + Celery <!-- VERIFY-ON-SERVER --> | Нативно, без Docker |

Prod portal запуск: `node node_modules/next/dist/bin/next start -p 3000` (через NSSM).

Перезапуск: `nssm restart snark-portal` или `Restart-Service snark-portal`.

---

## 2. Локальная разработка

### Инфраструктура

```bash
docker compose up -d
```

PostgreSQL :5432, MinIO :9000/:9001, Redis :6379.

### Portal

```bash
cp .env.example .env.local
# DATABASE_URL, JWT_*, S3_*, PROTOCOLS_API_URL=http://localhost:8000

pnpm install
pnpm db:migrate
pnpm init:users   # или pnpm seed:dev-users
pnpm dev
```

### Protocols

```bash
cd services/protocols
cp .env.example .env.local
# DATABASE_URL, REDIS_URL, PORTAL_INTERNAL_URL, INTERNAL_TOKEN, STT/LLM keys

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
alembic upgrade head

# Terminal 1
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2
celery -A src.core.celery_app.app.celery_app worker -l info --pool=solo
```

### Pre-commit verify (portal)

```bash
pnpm typecheck
pnpm test
pnpm lint
```

---

## 3. Production (Windows)

<!-- VERIFY-ON-SERVER --> Путь приложения: `C:\apps\snark-portal` (подтвердить на сервере).

На сервере **без Docker**: PostgreSQL, MinIO, Redis и Python — отдельные процессы; портал — **NSSM**-сервис `snark-portal`.

### Выкатка обновлений

<!-- VERIFY-ON-SERVER --> Предпочтительно через `.bat`-скрипт деплоя (имя и путь — см. §7).

```powershell
cd C:\apps\snark-portal
git pull origin main
pnpm install
pnpm db:migrate
pnpm build
nssm restart snark-portal
# или: Restart-Service snark-portal
# + перезапуск Python API и Celery worker <!-- VERIFY-ON-SERVER -->
```

### Только protocols (без миграций portal)

```powershell
cd C:\apps\snark-portal\services\protocols
git pull origin main
# activate venv, pip install -e . if deps changed
alembic upgrade head
# restart uvicorn + celery <!-- VERIFY-ON-SERVER -->
```

### Живёт только на сервере (нет в git)

- `.env.local` — секреты портала
- `services/protocols/.env.local` — секреты Python
- `.bat`-скрипт деплоя <!-- VERIFY-ON-SERVER -->

---

## 4. Чеклист перед prod-деплоем

- [ ] **SYNC-SERVER выполнен** — серверные правки в `origin/main`
- [ ] **Backup PostgreSQL** перед destructive-миграциями (обязательно; имя файла записать в DEP)
- [ ] **SHA коммита до деплоя** записан в строку `DEP-NNN` в PROGRESS
- [ ] `pnpm typecheck && pnpm test` — portal
- [ ] `ruff check` (и `pytest` когда есть) — protocols
- [ ] Миграции БД: `pnpm db:migrate` + `alembic upgrade head` (если менялась schema)
- [ ] `.env.example` обновлён при новых переменных
- [ ] Строка в PROGRESS → **Pending deploy** (`DEP-NNN`) с описанием и commit SHA
- [ ] После деплоя: smoke — login, dashboard, один критичный сценарий изменённого модуля
- [ ] Обновить статус `DEP-NNN` → `deployed` + запись в [`LOG.md`](LOG.md)

### Smoke-сценарии по модулям

| Модуль | Сценарий |
|--------|----------|
| Auth | login → dashboard → logout |
| Tasks | создать задачу → сменить статус |
| Chat | канал → сообщение → SSE |
| Protocols | upload → completed → DOCX → задачи sync |
| Support | создать заявку → admin видит |

---

## 5. Откат

1. `git reset --hard <previous-sha>` на сервере (SHA из строки DEP)
2. Restore PostgreSQL из backup (если были destructive-миграции)
3. `pnpm build && nssm restart snark-portal`
4. Перезапуск protocols <!-- VERIFY-ON-SERVER -->
5. Запись в [`LOG.md`](LOG.md) — инцидент и точка отката

---

## 6. Связь с оркестратором

1. Оркестратор помечает verified work как `DEP-NNN` в PROGRESS
2. Оператор деплоит по этому runbook (после SYNC-SERVER)
3. Smoke OK → `DEP-NNN` = `deployed` + запись в LOG.md

---

## 7. Вопросы оператору

Следующие пункты помечены `<!-- VERIFY-ON-SERVER -->` в тексте выше. Нужны ответы для финализации runbook:

1. **Точный путь приложения** на сервере — `C:\apps\snark-portal` верен?
2. **Имя и расположение `.bat`-скрипта** деплоя (полный путь)
3. **Python API и Celery** на проде — NSSM-сервисы, scheduled task, вручную после деплоя?
4. **Celery worker:** используется ли `--pool=solo` на проде (как в local dev)?
5. **Имя NSSM-сервиса** портала — `snark-portal` верно?

После ответов — обновить этот файл и убрать маркеры VERIFY.

---

*Детали локального запуска — также в [`../README.md`](../README.md).*
