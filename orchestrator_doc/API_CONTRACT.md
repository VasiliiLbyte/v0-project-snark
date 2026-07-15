# SNARK — API Contract: Portal ↔ Protocols

Контракт между **snark-portal** (Next.js) и **snark-protocols** (Python FastAPI).
Источники: `lib/protocols/client.ts`, `app/api/protocols/*`, `services/protocols/src/api/v1/protocols.py`.

При изменении API — **сначала** `snark-protocols`, **затем** portal proxy и UI.

---

## 1. Транспорт и конфигурация

| Переменная | Где | Назначение |
|------------|-----|------------|
| `PROTOCOLS_API_URL` | portal `.env.local` | Base URL Python API (default `http://localhost:8000`) |
| `PORTAL_INTERNAL_URL` | protocols `.env.local` | URL портала для webhook sync |
| `INTERNAL_TOKEN` | оба сервиса | Shared secret для internal routes |

Прокси-клиент: `lib/protocols/client.ts` → `proxyProtocolsRequest(path, init)`.

---

## 2. Публичный поток (browser → portal → Python)

Все маршруты портала требуют **JWT-сессию** (`requireAuth`). Портал добавляет поля при upload.

### 2.1 Upload

| Portal | Python |
|--------|--------|
| `POST /api/protocols/upload` | `POST /api/v1/protocols/upload` |

**Portal добавляет в FormData:**
- `source` = `"web"`
- `uploaded_by_user_id` = JWT `userId`

**Python принимает (multipart/form-data):**
- `file` — аудио/видео (max 2 GB)
- `title`, `meeting_date`, `participants` (опционально)
- `source`: `telegram` | `web`
- `uploaded_by_user_id` (для web)

**Ответ:** `201` + `ProtocolUploadResponseSchema` (`id`, `status`, …)

**Ошибки portal:**
- `503` + `PROTOCOLS_UNAVAILABLE` — Python не запущен
- `PROTOCOLS_UPLOAD_FAILED` — upstream error

### 2.2 List

| Portal | Python |
|--------|--------|
| `GET /api/protocols?...` | `GET /api/v1/protocols/?...` |

Query params пробрасываются как есть.

### 2.3 Detail

| Portal | Python |
|--------|--------|
| `GET /api/protocols/{id}` | `GET /api/v1/protocols/{id}` |

Включает `transcript_text`, `protocol_text`, action items.

### 2.4 Export DOCX

| Portal | Python |
|--------|--------|
| `GET /api/protocols/{id}/export-docx` | `GET /api/v1/protocols/{id}/export-docx` (или stream через Python) |

Возвращает `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.

---

## 3. Python-only endpoints (прямой доступ / Telegram)

Доступны на `:8000` без portal proxy (для бота и отладки):

| Method | Path | Назначение |
|--------|------|------------|
| GET | `/api/v1/protocols/{id}/celery-status` | Статус Celery-задачи |
| POST | `/api/v1/protocols/{id}/retry-processing` | Повторная обработка |
| PATCH | `/api/v1/protocols/action-items/{id}/status` | Статус поручения |

При добавлении в UI портала — создать соответствующий `app/api/protocols/...` proxy.

---

## 4. Internal webhook (Python → Portal)

| Caller | Endpoint | Auth |
|--------|----------|------|
| Python `ProtocolService` | `POST /api/internal/protocols/action-items/sync` | `X-Internal-Token` |

**Payload (JSON):**

```json
{
  "protocolId": 1,
  "protocolTitle": "Совещание",
  "meetingDate": "2026-07-15",
  "actionItems": [
    {
      "id": 1,
      "text": "Подготовить отчёт",
      "assignee": "Иванов Иван Иванович",
      "deadline": "2026-07-20",
      "priority": "high"
    }
  ]
}
```

**Поведение portal:** `syncProtocolActionItems()` — создаёт задачи, матчинг assignee по точному ФИО (`lib/protocols/match-assignee.ts`).

**Ошибки:**
- `401` — неверный `X-Internal-Token`
- `400` — `INVALID_PAYLOAD`

---

## 5. Статусы и enum

### ProtocolStatus

`uploaded` → `processing` → `transcribing` → `generating` → `completed` | `failed`

### ActionItemStatus

`pending` | `in_progress` | `done` | `overdue` | `cancelled`

### UploadSource

`telegram` | `web`

Схемы: `services/protocols/src/modules/protocols/schemas.py` (`ProtocolStatusEnum`, `ActionItemStatusEnum`).

---

## 6. Пайплайн обработки (справка)

1. Upload → encrypt file (FZ-152) → Celery `process_meeting_audio`
2. STT → diarization → LLM (protocol + action items)
3. On `completed` → webhook sync → portal tasks

---

## 7. Verify при изменениях

**Protocols-first:**
```bash
cd services/protocols
ruff check src/
# pytest when available
curl http://localhost:8000/docs
```

**Portal:**
```bash
pnpm typecheck
pnpm test
# Manual: /protocols → upload → wait completed → tasks created
```

---

*При расхождении с кодом — код является источником истины; обновите этот контракт в той же сессии.*
