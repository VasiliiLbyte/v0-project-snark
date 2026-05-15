import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { PortalUserMutationError } from "@/lib/repositories/portal-repository.drizzle"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminPortalUserRoleUpdateSchema,
  adminPortalUserSingleResponseSchema,
  apiErrorSchema,
} from "@/lib/validators/portal"

interface RouteContext {
  params: Promise<{ id: string }>
}

const idSchema = z.string().uuid()

type MutationErrorLike = { status: number; code: string; message: string }

function isMutationError(error: unknown): error is MutationErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as MutationErrorLike).status === "number" &&
    typeof (error as MutationErrorLike).code === "string" &&
    typeof (error as MutationErrorLike).message === "string"
  )
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(request, ["admin"])
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор пользователя",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    if (parsedId.data === auth.userId) {
      const payload = apiErrorSchema.parse({
        error: "Нельзя изменить роль собственной учётной записи",
        code: "FORBIDDEN",
      })
      return NextResponse.json(payload, { status: 403 })
    }

    const body = await request.json()
    const parsed = adminPortalUserRoleUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Укажите корректную роль",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    try {
      const item = await getPortalRepositoryServer().updateAdminPortalUserRole(parsedId.data, parsed.data.role)
      const response = adminPortalUserSingleResponseSchema.parse({ item })
      await writeAuditLog({
        userId: auth.userId,
        action: "admin:users:role",
        resourceType: "users",
        resourceId: parsedId.data,
        statusCode: 200,
      })
      return NextResponse.json(response)
    } catch (mutationError) {
      if (mutationError instanceof PortalUserMutationError || isMutationError(mutationError)) {
        const status = mutationError.status
        const payload = apiErrorSchema.parse({
          error: mutationError.message,
          code: mutationError.code,
        })
        return NextResponse.json(payload, { status })
      }
      throw mutationError
    }
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось обновить роль", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
