import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  apiErrorSchema,
  ticketAdminUpdateSchema,
  ticketDetailResponseSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(request, ["admin"])
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор заявки",
        code: "INVALID_ID",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const body = await request.json()
    const parsed = ticketAdminUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные данные заявки",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const updated = await getPortalRepositoryServer().updateAdminTicket(parsedId.data, parsed.data)
    await writeAuditLog({
      userId: auth.userId,
      action: "admin:tickets:update",
      resourceType: "tickets",
      resourceId: parsedId.data,
      statusCode: 200,
    })
    return NextResponse.json(ticketDetailResponseSchema.parse({ item: updated }))
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось обновить заявку", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
