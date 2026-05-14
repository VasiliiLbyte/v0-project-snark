import { NextRequest, NextResponse } from "next/server"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  apiErrorSchema,
  eventCreateSchema,
  eventDetailResponseSchema,
} from "@/lib/validators/portal"

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const body = await request.json()
    const parsed = eventCreateSchema.safeParse(body)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные данные события",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    const created = await getPortalRepositoryServer().createEvent({
      ...parsed.data,
      createdBy: auth.userId,
    })
    await writeAuditLog({
      userId: auth.userId,
      action: "admin:events:create",
      resourceType: "events",
      resourceId: created.id,
      statusCode: 201,
    })
    return NextResponse.json(
      eventDetailResponseSchema.parse({ item: created }),
      { status: 201 }
    )
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось создать событие", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
