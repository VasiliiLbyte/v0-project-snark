import { describe, expect, it } from "vitest"
import { MOCK_PROD_CONFLICT_MESSAGE, resolveIsMockDb } from "@/lib/config/mode"

describe("resolveIsMockDb matrix (S-1)", () => {
  const mockValues = [undefined, "", "true", "false", "TRUE", "1"] as const
  const nodeEnvs = ["development", "production"] as const

  for (const useMock of mockValues) {
    for (const nodeEnv of nodeEnvs) {
      const label = `USE_MOCK_DB=${JSON.stringify(useMock)} NODE_ENV=${nodeEnv}`

      it(label, () => {
        const env = {
          USE_MOCK_DB: useMock,
          NODE_ENV: nodeEnv,
        }

        if (nodeEnv === "production" && useMock === "true") {
          expect(() => resolveIsMockDb(env)).toThrow(MOCK_PROD_CONFLICT_MESSAGE)
          return
        }

        const result = resolveIsMockDb(env)
        expect(result).toBe(useMock === "true")
      })
    }
  }

  it("allows mock during next build phase when USE_MOCK_DB=true", () => {
    expect(
      resolveIsMockDb({
        USE_MOCK_DB: "true",
        NODE_ENV: "production",
        NEXT_PHASE: "phase-production-build",
      })
    ).toBe(true)
  })
})
