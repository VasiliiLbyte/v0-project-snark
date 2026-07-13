/**
 * Единая точка режима mock/prod.
 * Прямые чтения process.env.USE_MOCK_DB вне этого модуля запрещены.
 */

export const MOCK_PROD_CONFLICT_MESSAGE =
  "FATAL: USE_MOCK_DB=true недопустим при NODE_ENV=production. Установите USE_MOCK_DB=false или уберите переменную."

export interface ModeEnv {
  USE_MOCK_DB?: string
  NODE_ENV?: string
  NEXT_PHASE?: string
}

/**
 * Mock включается только при точном "true".
 * Любое иное значение / отсутствие → реальный режим.
 * production + USE_MOCK_DB=true → throw (кроме фазы `next build`, где mock
 * допускается только для локальной SSG; рантайм падает в assertSafeRuntimeMode).
 */
export function resolveIsMockDb(env: ModeEnv = process.env): boolean {
  const mockRequested = env.USE_MOCK_DB === "true"
  if (env.NODE_ENV === "production" && mockRequested) {
    // next build подхватывает .env.local; падаем на старте сервера, не на generate.
    if (env.NEXT_PHASE === "phase-production-build" || process.env.NEXT_PHASE === "phase-production-build") {
      return true
    }
    throw new Error(MOCK_PROD_CONFLICT_MESSAGE)
  }
  return mockRequested
}

export function isMockDb(): boolean {
  return resolveIsMockDb(process.env)
}

/** Alias: mock-auth следует тому же флагу, что и mock-db. */
export function isMockAuth(): boolean {
  return isMockDb()
}

/** Проверка на старте приложения (instrumentation / bootstrap). Всегда FATAL при prod+mock. */
export function assertSafeRuntimeMode(): void {
  if (process.env.NODE_ENV === "production" && process.env.USE_MOCK_DB === "true") {
    throw new Error(MOCK_PROD_CONFLICT_MESSAGE)
  }
}
