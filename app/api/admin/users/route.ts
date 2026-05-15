import { NextRequest, NextResponse } from "next/server"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { PortalUserMutationError } from "@/lib/repositories/portal-repository.drizzle"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminPortalUserCreateSchema,
  adminPortalUserSingleResponseSchema,
  adminPortalUsersResponseSchema,
  apiErrorSchema,
} from "@/lib/validators/portal"

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

export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ["admin"])
    const data = await getPortalRepositoryServer().listAdminPortalUsers()
    const response = adminPortalUsersResponseSchema.parse(data)

    await writeAuditLog({
      userId: auth.userId,
      action: "admin:users:list",
      resourceType: "users",
      statusCode: 200,
    })
    return NextResponse.json(response)
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось загрузить пользователей", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ["admin"])
    const body = await request.json()
    const parsed = adminPortalUserCreateSchema.safeParse(body)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Проверьте корректность данных: email, пароль (не короче 6 символов), имя и фамилия",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    try {
      const created = await getPortalRepositoryServer().createAdminPortalUser(parsed.data)
      const response = adminPortalUserSingleResponseSchema.parse({ item: created })
      await writeAuditLog({
        userId: auth.userId,
        action: "admin:users:create",
        resourceType: "users",
        resourceId: created.id,
        statusCode: 201,
      })
      return NextResponse.json(response, { status: 201 })
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
        ? apiErrorSchema.parse({ error: "Не удалось создать пользователя", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
