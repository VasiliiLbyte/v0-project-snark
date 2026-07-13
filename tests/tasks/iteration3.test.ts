import { describe, expect, it } from "vitest"
import { isTaskOverdue } from "@/lib/tasks/overdue"
import { validateTaskFile } from "@/lib/storage/task-file-rules"

describe("Iteration 3 — overdue", () => {
  it("marks past due active tasks as overdue", () => {
    expect(
      isTaskOverdue({
        dueDate: "2020-01-01",
        status: "in_progress",
      })
    ).toBe(true)
  })

  it("ignores done and cancelled", () => {
    expect(isTaskOverdue({ dueDate: "2020-01-01", status: "done" })).toBe(false)
    expect(isTaskOverdue({ dueDate: "2020-01-01", status: "cancelled" })).toBe(false)
  })

  it("ignores empty due date", () => {
    expect(isTaskOverdue({ dueDate: null, status: "new" })).toBe(false)
  })
})

describe("Iteration 3 — attachments validation", () => {
  it("rejects files over 25MB", () => {
    const file = {
      size: 26 * 1024 * 1024,
      type: "application/pdf",
      name: "big.pdf",
    } as File
    expect(validateTaskFile(file)).toMatch(/25/)
  })

  it("allows zip archives", () => {
    const file = {
      size: 1000,
      type: "application/zip",
      name: "archive.zip",
    } as File
    expect(validateTaskFile(file)).toBeNull()
  })
})
