import { describe, expect, it } from "vitest"
import {
  mockCreateChannel,
  mockListMessages,
  mockSendMessage,
  mockUserCanAccessChannel,
} from "@/lib/repositories/chat.mock-store"

describe("chat mock ACL smoke", () => {
  it("non-member cannot list or send messages", () => {
    const creatorId = "00000000-0000-0000-0000-000000000001"
    const outsiderId = "00000000-0000-0000-0000-000000000099"
    const channel = mockCreateChannel({
      name: "ACL test",
      type: "group",
      createdBy: creatorId,
      memberIds: [],
    })

    expect(mockUserCanAccessChannel(channel.id, creatorId)).toBe(true)
    expect(mockUserCanAccessChannel(channel.id, outsiderId)).toBe(false)
    expect(() => mockListMessages(channel.id, outsiderId)).toThrow(/Нет доступа/)
    expect(() => mockSendMessage(channel.id, outsiderId, "hi")).toThrow(/Нет доступа/)
  })
})
