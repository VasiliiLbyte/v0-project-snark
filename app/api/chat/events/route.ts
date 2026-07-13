import { NextRequest } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { eventVisibleToUser, getRealtimeBus, type RealtimeEvent } from "@/lib/realtime/bus"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    const encoder = new TextEncoder()
    let cleanup: (() => void) | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: RealtimeEvent | { type: "connected" }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        send({ type: "connected" })

        cleanup = getRealtimeBus().subscribe((event) => {
          if (eventVisibleToUser(event, auth.userId)) {
            send(event)
          }
        })

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch {
            // closed
          }
        }, 25000)

        request.signal.addEventListener("abort", () => {
          if (heartbeat) clearInterval(heartbeat)
          cleanup?.()
          try {
            controller.close()
          } catch {
            // ignore
          }
        })
      },
      cancel() {
        if (heartbeat) clearInterval(heartbeat)
        cleanup?.()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 401
    return new Response(JSON.stringify({ error: known.message ?? "Unauthorized" }), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  }
}
