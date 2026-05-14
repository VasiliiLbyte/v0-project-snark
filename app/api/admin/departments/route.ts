import { NextRequest, NextResponse } from "next/server"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { DepartmentMutationError } from "@/lib/repositories/portal-repository.drizzle"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminDepartmentUpsertSchema,
  adminDepartmentsResponseSchema,
  apiErrorSchema,
} from "@/lib/validators/portal"

type MutationErrorLike = { status: number; code: string; message: string }

function isMutationError(error: unknown): error is MutationErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as MutationErrorLike).status === "number" &&
    typeof (error as MutationErrorLike).code === "string"
  )
}

export async function GET(request: NextRequest) {
  try {
    requireRole(request, ["admin", "hr_manager"])
    const data = await getPortalRepositoryServer().listAdminDepartments()
    const response = adminDepartmentsResponseSchema.parse(data)
    return NextResponse.json(response)
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({
            error: "Не удалось загрузить подразделения",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const body = await request.json()
    const parsed = adminDepartmentUpsertSchema.safeParse(body)
    if (!parsed.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректные данные подразделения",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    try {
      const created = await getPortalRepositoryServer().createDepartment(parsed.data)
      await writeAuditLog({
        userId: auth.userId,
        action: "admin:departments:create",
        resourceType: "department",
        resourceId: created.id,
        statusCode: 201,
      })
      return NextResponse.json({ item: created }, { status: 201 })
    } catch (mutationError) {
      if (mutationError instanceof DepartmentMutationError || isMutationError(mutationError)) {
        const payload = apiErrorSchema.parse({
          error: mutationError.message,
          code: mutationError.code,
        })
        return NextResponse.json(payload, { status: 400 })
      }
      throw mutationError
    }
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({
            error: "Не удалось создать подразделение",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
