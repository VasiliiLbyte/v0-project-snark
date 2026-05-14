import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import { apiErrorSchema } from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор события",
        code: "INVALID_ID",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    await getPortalRepositoryServer().deleteEvent(parsedId.data)
    await writeAuditLog({
      userId: auth.userId,
      action: "admin:events:delete",
      resourceType: "events",
      resourceId: parsedId.data,
      statusCode: 200,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось удалить событие", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
