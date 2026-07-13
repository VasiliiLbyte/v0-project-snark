import "server-only"

export class InternalAuthError extends Error {
  status = 401
  code = "UNAUTHORIZED"

  constructor(message = "Неверный внутренний токен") {
    super(message)
    this.name = "InternalAuthError"
  }
}

/** Shared-secret для сервиса протоколов ↔ портал. */
export function assertInternalToken(request: Request): void {
  const expected = process.env.INTERNAL_TOKEN?.trim()
  if (!expected) {
    throw new InternalAuthError("INTERNAL_TOKEN не настроен на портале")
  }
  const provided = request.headers.get("x-internal-token")?.trim()
  if (!provided || provided !== expected) {
    throw new InternalAuthError()
  }
}
