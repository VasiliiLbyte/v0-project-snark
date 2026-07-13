import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { assertInternalToken, InternalAuthError } from "@/lib/auth/internal-token"
import { syncProtocolActionItems } from "@/lib/protocols/sync-action-items"
import { apiErrorSchema } from "@/lib/validators/portal"

export const dynamic = "force-dynamic"

const syncPayloadSchema = z.object({
  protocolId: z.coerce.number().int().positive(),
  protocolTitle: z.string().trim().max(500).optional().nullable(),
  meetingDate: z.string().trim().max(32).optional().nullable(),
  actionItems: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        text: z.string().trim().min(1).max(5000),
        assignee: z.string().trim().max(300).optional().nullable(),
        deadline: z.string().trim().max(32).optional().nullable(),
        priority: z.string().trim().max(32).optional().nullable(),
      })
    )
    .min(1)
    .max(200),
})

/**
 * Внутренний webhook: Python-сервис протоколов → задачи портала.
 * Auth: заголовок X-Internal-Token === INTERNAL_TOKEN.
 */
export async function POST(request: NextRequest) {
  try {
    assertInternalToken(request)
    const body = await request.json()
    const parsed = syncPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Некорректный payload sync", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    const result = await syncProtocolActionItems(parsed.data)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof InternalAuthError) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: error.message, code: error.code }),
        { status: error.status }
      )
    }
    const message = error instanceof Error ? error.message : "Ошибка синхронизации"
    return NextResponse.json(
      apiErrorSchema.parse({ error: message, code: "INTERNAL_ERROR" }),
      { status: 500 }
    )
  }
}
