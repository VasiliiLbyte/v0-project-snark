import { NextRequest, NextResponse } from "next/server"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { addChannelMembers, removeChannelMembers } from "@/lib/repositories/chat.repository"
import { apiErrorSchema, chatChannelSchema } from "@/lib/validators/portal"
import { z } from "zod"

const membersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const body = await request.json()
    const parsed = membersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Укажите участников", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    const channel = await addChannelMembers(id, auth.userId, parsed.data.memberIds)
    return NextResponse.json({ item: chatChannelSchema.parse(channel) })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось добавить участников"
    const status =
      known.status ?? (message.includes("доступ") ? 403 : message.includes("найден") ? 404 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code:
          status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status === 500
                ? "INTERNAL_ERROR"
                : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const body = await request.json()
    const parsed = membersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        apiErrorSchema.parse({ error: "Укажите участников", code: "INVALID_PAYLOAD" }),
        { status: 400 }
      )
    }

    const channel = await removeChannelMembers(id, auth.userId, parsed.data.memberIds)
    return NextResponse.json({ item: chatChannelSchema.parse(channel) })
  } catch (error) {
    const known = error as Partial<AuthError>
    const message = error instanceof Error ? error.message : "Не удалось удалить участников"
    const status =
      known.status ?? (message.includes("доступ") ? 403 : message.includes("найден") ? 404 : 500)
    return NextResponse.json(
      apiErrorSchema.parse({
        error: status === 500 ? message : (known.message ?? message),
        code:
          status === 403
            ? "FORBIDDEN"
            : status === 404
              ? "NOT_FOUND"
              : status === 500
                ? "INTERNAL_ERROR"
                : (known.code ?? "AUTH_ERROR"),
      }),
      { status }
    )
  }
}
