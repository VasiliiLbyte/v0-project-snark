import { describe, expect, it } from "vitest"
import { matchAssigneeExact, normalizeFio } from "@/lib/protocols/match-assignee"

describe("Iteration 4 — FIO match", () => {
  const users = [
    { id: "u1", firstName: "Иван", lastName: "Иванов" },
    { id: "u2", firstName: "Анна", lastName: "Петрова" },
    { id: "u3", firstName: "Иван", lastName: "Сидоров" },
  ]

  it("normalizes whitespace and case", () => {
    expect(normalizeFio("  Иванов   Иван ")).toBe("иванов иван")
  })

  it("matches exact Last First", () => {
    expect(matchAssigneeExact("Иванов Иван", users)).toBe("u1")
  })

  it("matches First Last order", () => {
    expect(matchAssigneeExact("Анна Петрова", users)).toBe("u2")
  })

  it("rejects initials (no fuzzy)", () => {
    expect(matchAssigneeExact("Иванов И.И.", users)).toBeNull()
  })

  it("rejects ambiguity when duplicates exist", () => {
    const dupes = [
      { id: "a", firstName: "Иван", lastName: "Иванов" },
      { id: "b", firstName: "Иван", lastName: "Иванов" },
    ]
    expect(matchAssigneeExact("Иванов Иван", dupes)).toBeNull()
  })

  it("empty assignee → null", () => {
    expect(matchAssigneeExact("", users)).toBeNull()
    expect(matchAssigneeExact(null, users)).toBeNull()
  })
})
