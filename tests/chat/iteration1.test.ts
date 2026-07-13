import { describe, expect, it } from "vitest"
import {
  mockAddChannelMembers,
  mockCreateChannel,
  mockFindOrCreateDirectChannel,
  mockListChannelsForUser,
  mockSendMessage,
} from "@/lib/repositories/chat.mock-store"

const creator = "00000000-0000-0000-0000-000000000001"
const peer = "00000000-0000-0000-0000-000000000002"
const newbie = "00000000-0000-0000-0000-000000000003"

describe("chat iteration 1", () => {
  it("new member with null lastReadAt sees prior messages as unread", () => {
    const channel = mockCreateChannel({
      name: "Группа",
      type: "group",
      createdBy: creator,
      memberIds: [peer],
    })
    mockSendMessage(channel.id, creator, "привет")
    mockSendMessage(channel.id, peer, "ответ")

    mockAddChannelMembers(channel.id, creator, [newbie])
    const listed = mockListChannelsForUser(newbie)
    const item = listed.find((c) => c.id === channel.id)
    expect(item?.unreadCount).toBe(2)
  })

  it("findOrCreateDirectChannel is deterministic (same pair → same channel)", () => {
    const a = mockFindOrCreateDirectChannel(creator, peer)
    const b = mockFindOrCreateDirectChannel(peer, creator)
    expect(a.id).toBe(b.id)
  })
})
