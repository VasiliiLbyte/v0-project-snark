import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { DepartmentMutationError } from "@/lib/repositories/portal-repository.drizzle"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminDepartmentItemSchema,
  adminDepartmentUpsertSchema,
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
    typeof (error as MutationErrorLike).code === "string"
  )
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }
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
      const item = await getPortalRepositoryServer().updateDepartment(
        parsedId.data,
        parsed.data
      )
      await writeAuditLog({
        userId: auth.userId,
        action: "admin:departments:update",
        resourceType: "department",
        resourceId: parsedId.data,
        statusCode: 200,
      })
      return NextResponse.json({ item: adminDepartmentItemSchema.parse(item) })
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
            error: "Не удалось обновить подразделение",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const { id } = await context.params
    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      const payload = apiErrorSchema.parse({
        error: "Некорректный идентификатор",
        code: "INVALID_PAYLOAD",
      })
      return NextResponse.json(payload, { status: 400 })
    }
    try {
      await getPortalRepositoryServer().deleteDepartment(parsedId.data)
      await writeAuditLog({
        userId: auth.userId,
        action: "admin:departments:delete",
        resourceType: "department",
        resourceId: parsedId.data,
        statusCode: 200,
      })
      return NextResponse.json({ ok: true })
    } catch (mutationError) {
      if (mutationError instanceof DepartmentMutationError || isMutationError(mutationError)) {
        await writeAuditLog({
          userId: auth.userId,
          action: "admin:departments:delete",
          resourceType: "department",
          resourceId: parsedId.data,
          statusCode: 400,
          metadata: mutationError.code,
        })
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
            error: "Не удалось удалить подразделение",
            code: "INTERNAL_ERROR",
          })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
