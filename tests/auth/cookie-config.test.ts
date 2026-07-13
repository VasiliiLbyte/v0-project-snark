import { afterEach, describe, expect, it, vi } from "vitest"
import {
  resetCookieConfigWarningForTests,
  resolveCookieSecure,
  validateCookieConfig,
} from "@/lib/auth/tokens"

afterEach(() => {
  resetCookieConfigWarningForTests()
  vi.restoreAllMocks()
})

describe("resolveCookieSecure (S-2)", () => {
  it("COOKIE_SECURE=true → secure regardless of NODE_ENV", () => {
    expect(resolveCookieSecure({ NODE_ENV: "development", COOKIE_SECURE: "true" })).toBe(true)
    expect(resolveCookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "true" })).toBe(true)
  })

  it("COOKIE_SECURE=false → not secure even in production", () => {
    expect(resolveCookieSecure({ NODE_ENV: "production", COOKIE_SECURE: "false" })).toBe(false)
  })

  it("unset COOKIE_SECURE falls back to NODE_ENV", () => {
    expect(resolveCookieSecure({ NODE_ENV: "production" })).toBe(true)
    expect(resolveCookieSecure({ NODE_ENV: "development" })).toBe(false)
    expect(resolveCookieSecure({})).toBe(false)
  })
})

describe("validateCookieConfig", () => {
  it("sameSite strict in production, lax otherwise", () => {
    const prod = validateCookieConfig(60, { NODE_ENV: "production", COOKIE_SECURE: "true" })
    expect(prod.sameSite).toBe("strict")
    expect(prod.secure).toBe(true)
    expect(prod.httpOnly).toBe(true)

    const dev = validateCookieConfig(60, { NODE_ENV: "development", COOKIE_SECURE: "false" })
    expect(dev.sameSite).toBe("lax")
    expect(dev.secure).toBe(false)
  })

  it("warns once on production + COOKIE_SECURE=false", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    validateCookieConfig(60, { NODE_ENV: "production", COOKIE_SECURE: "false" })
    validateCookieConfig(60, { NODE_ENV: "production", COOKIE_SECURE: "false" })
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
