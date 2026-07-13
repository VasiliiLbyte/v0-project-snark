import { afterEach, describe, expect, it, vi } from "vitest"
import { assertSafeRuntimeMode, MOCK_PROD_CONFLICT_MESSAGE } from "@/lib/config/mode"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("assertSafeRuntimeMode", () => {
  it("throws when production + USE_MOCK_DB=true", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("USE_MOCK_DB", "true")
    expect(() => assertSafeRuntimeMode()).toThrow(MOCK_PROD_CONFLICT_MESSAGE)
  })
})
