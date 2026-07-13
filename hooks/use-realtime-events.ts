"use client"

import { useEffect, useRef } from "react"
import type { RealtimeEvent } from "@/lib/realtime/types"

type ClientEvent = RealtimeEvent | { type: "connected" }

interface UseRealtimeEventsOptions {
  enabled?: boolean
  onEvent: (event: ClientEvent) => void
  /** Fallback polling while SSE down / as catch-up (ms). Default 15000. */
  fallbackIntervalMs?: number
  onFallbackPoll?: () => void
}

/**
 * SSE client for /api/chat/events with reconnect and optional 15s fallback polling.
 */
export function useRealtimeEvents({
  enabled = true,
  onEvent,
  fallbackIntervalMs = 15_000,
  onFallbackPoll,
}: UseRealtimeEventsOptions): void {
  const onEventRef = useRef(onEvent)
  const onFallbackPollRef = useRef(onFallbackPoll)
  onEventRef.current = onEvent
  onFallbackPollRef.current = onFallbackPoll

  useEffect(() => {
    if (!enabled) return

    let closed = false
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let fallbackTimer: ReturnType<typeof setInterval> | null = null
    let attempt = 0

    const startFallback = () => {
      if (fallbackTimer || !onFallbackPollRef.current) return
      fallbackTimer = setInterval(() => {
        onFallbackPollRef.current?.()
      }, fallbackIntervalMs)
    }

    const stopFallback = () => {
      if (fallbackTimer) {
        clearInterval(fallbackTimer)
        fallbackTimer = null
      }
    }

    const connect = () => {
      if (closed) return
      source = new EventSource("/api/chat/events")

      source.onopen = () => {
        attempt = 0
        stopFallback()
      }

      source.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as ClientEvent
          onEventRef.current(data)
        } catch {
          // ignore malformed
        }
      }

      source.onerror = () => {
        source?.close()
        source = null
        startFallback()
        onFallbackPollRef.current?.()
        const delay = Math.min(30_000, 1000 * 2 ** attempt)
        attempt += 1
        reconnectTimer = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      closed = true
      source?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      stopFallback()
    }
  }, [enabled, fallbackIntervalMs])
}
