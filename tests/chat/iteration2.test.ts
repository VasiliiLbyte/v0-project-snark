import { describe, expect, it, beforeEach } from "vitest"
import { extractMentionUserIds, splitMentions } from "@/lib/mentions/parse"
import {
  assertMessageRateLimit,
  resetMessageRateLimitForTests,
} from "@/lib/realtime/rate-limit"
import { eventVisibleToUser, getRealtimeBus } from "@/lib/realtime/bus"
import type { ChatMessage } from "@/types/portal"

describe("Iteration 2 — mentions", () => {
  const employees = [
    { userId: "u1", name: "Иванов Иван" },
    { userId: "u2", name: "Иванов" },
    { userId: "u3", name: "Петрова Анна" },
  ]

  it("extracts longest @name first", () => {
    const ids = extractMentionUserIds("Привет @Иванов Иван и @Петрова Анна", employees)
    expect(ids).toContain("u1")
    expect(ids).toContain("u3")
    expect(ids).not.toContain("u2")
  })

  it("splits mentions for highlight", () => {
    const parts = splitMentions("Hi @Петрова Анна!", employees)
    expect(parts.some((p) => p.mention && p.text.toLowerCase().includes("петрова"))).toBe(true)
  })
})

describe("Iteration 2 — rate limit", () => {
  beforeEach(() => {
    resetMessageRateLimitForTests()
  })

  it("allows up to 60 messages per minute", () => {
    for (let i = 0; i < 60; i++) {
      expect(() => assertMessageRateLimit("user-a")).not.toThrow()
    }
    expect(() => assertMessageRateLimit("user-a")).toThrow(/Слишком много/)
  })

  it("isolates users", () => {
    for (let i = 0; i < 60; i++) assertMessageRateLimit("user-a")
    expect(() => assertMessageRateLimit("user-b")).not.toThrow()
  })
})

describe("Iteration 2 — realtime bus", () => {
  it("filters events by membership", () => {
    const message = {
      id: "00000000-0000-4000-8000-000000000001",
      channelId: "00000000-0000-4000-8000-000000000002",
      authorId: "00000000-0000-4000-8000-000000000003",
      authorName: "A",
      body: "hi",
      messageType: "user" as const,
      replyToId: null,
      createdAt: new Date().toISOString(),
      editedAt: null,
    } satisfies ChatMessage

    const event = {
      type: "message.new" as const,
      channelId: "c1",
      message,
      memberIds: ["u1", "u2"],
    }

    expect(eventVisibleToUser(event, "u1")).toBe(true)
    expect(eventVisibleToUser(event, "u9")).toBe(false)
    expect(
      eventVisibleToUser(
        {
          type: "notification.new",
          userId: "u9",
          notification: {
            id: "n1",
            type: "mention",
            title: "x",
            entityType: null,
            entityId: null,
            createdAt: new Date().toISOString(),
          },
        },
        "u9"
      )
    ).toBe(true)
  })

  it("delivers published events to subscribers", () => {
    const bus = getRealtimeBus()
    const received: string[] = []
    const unsub = bus.subscribe((event) => {
      if (event.type === "channel.updated") received.push(event.channelId)
    })
    bus.publish({ type: "channel.updated", channelId: "ch-test", memberIds: ["a"] })
    unsub()
    expect(received).toContain("ch-test")
  })
})
