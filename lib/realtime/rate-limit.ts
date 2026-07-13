/** In-memory rate limit: 60 сообщений / минуту на пользователя (один процесс NSSM). */

const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 60

const hits = new Map<string, number[]>()

export function assertMessageRateLimit(userId: string): void {
  const now = Date.now()
  const recent = (hits.get(userId) ?? []).filter((ts) => now - ts < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    throw new Error("Слишком много сообщений. Подождите минуту.")
  }
  recent.push(now)
  hits.set(userId, recent)
}

/** Только для тестов. */
export function resetMessageRateLimitForTests(): void {
  hits.clear()
}
