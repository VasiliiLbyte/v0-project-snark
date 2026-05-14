import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth, type AuthError } from "@/lib/auth/request-auth"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import { apiErrorSchema, ticketDetailResponseSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request)
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор заявки",
        code: "INVALID_ID",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const result = await getPortalRepositoryServer().getTicketById(parsedId.data, {
      userId: auth.userId,
      role: auth.role,
    })
    if (!result.item) {
      const payload = apiErrorSchema.parse({ error: "Заявка не найдена", code: "NOT_FOUND" })
      return NextResponse.json(payload, { status: 404 })
    }
    return NextResponse.json(ticketDetailResponseSchema.parse(result))
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось загрузить заявку", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
