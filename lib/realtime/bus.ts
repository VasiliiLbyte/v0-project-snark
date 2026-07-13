import { EventEmitter } from "node:events"
import type { RealtimeEvent } from "@/lib/realtime/types"

export type { RealtimeEvent } from "@/lib/realtime/types"

export interface RealtimeBus {
  publish(event: RealtimeEvent): void
  subscribe(handler: (event: RealtimeEvent) => void): () => void
}

class InProcessRealtimeBus implements RealtimeBus {
  private readonly emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(500)
  }

  publish(event: RealtimeEvent): void {
    this.emitter.emit("event", event)
  }

  subscribe(handler: (event: RealtimeEvent) => void): () => void {
    this.emitter.on("event", handler)
    return () => {
      this.emitter.off("event", handler)
    }
  }
}

const globalForRealtime = globalThis as unknown as { __snarkRealtimeBus?: RealtimeBus }

export function getRealtimeBus(): RealtimeBus {
  if (!globalForRealtime.__snarkRealtimeBus) {
    globalForRealtime.__snarkRealtimeBus = new InProcessRealtimeBus()
  }
  return globalForRealtime.__snarkRealtimeBus
}

export function eventVisibleToUser(event: RealtimeEvent, userId: string): boolean {
  if (event.type === "notification.new") {
    return event.userId === userId
  }
  return event.memberIds.includes(userId)
}
