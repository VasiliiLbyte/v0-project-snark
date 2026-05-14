import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { requireRole, type AuthError } from "@/lib/auth/request-auth"
import { writeAuditLog } from "@/lib/audit/log"
import { getPortalRepositoryServer } from "@/lib/repositories/portal-repository.server"
import {
  adminEmployeeUpsertSchema,
  apiErrorSchema,
  employeeImportResponseSchema,
} from "@/lib/validators/portal"
import type { AdminEmployeeUpsertPayload } from "@/types/portal"

type CellValue = string | number | boolean | Date | null | undefined
type SheetRow = CellValue[]

const HEADER_MARKER = "сотрудник"
const HEADER_SEARCH_LIMIT = 200

const COLS = {
  fullName: 0,
  department: 3,
  position: 21,
  inn: 22,
  snils: 23,
  birthDate: 24,
  address: 25,
  citizenship: 26,
  anniversaryYears: 27,
  professions: 29,
  education: 31,
  managerPosition: 32,
  contractEndDate: 33,
  isContractor: 34,
} as const

function toTrimmedString(value: CellValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString()
  }
  return String(value).trim()
}

function normalizeDate(value: CellValue): string | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return undefined
    const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
    return date.toISOString().slice(0, 10)
  }
  const asString = String(value).trim()
  if (!asString) return undefined
  const ruMatch = asString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (ruMatch) {
    const [, day, month, year] = ruMatch
    return `${year}-${month}-${day}`
  }
  const isoMatch = asString.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const maybeDate = new Date(asString)
  if (!Number.isNaN(maybeDate.getTime())) {
    return maybeDate.toISOString().slice(0, 10)
  }
  return undefined
}

function parseYesNo(value: CellValue): boolean | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "boolean") return value
  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return undefined
  if (["да", "yes", "true", "1", "y"].includes(normalized)) return true
  if (["нет", "no", "false", "0", "n"].includes(normalized)) return false
  return undefined
}

function parseInteger(value: CellValue): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value)
  const cleaned = String(value).trim().replace(/[^\d-]/g, "")
  if (!cleaned) return undefined
  const parsed = Number.parseInt(cleaned, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

function findHeaderRowIndex(rows: SheetRow[]): number {
  const limit = Math.min(rows.length, HEADER_SEARCH_LIMIT)
  for (let i = 0; i < limit; i += 1) {
    const cell = rows[i]?.[COLS.fullName]
    if (toTrimmedString(cell).toLowerCase() === HEADER_MARKER) {
      return i
    }
  }
  return -1
}

function buildPayloadFromRow(row: SheetRow): AdminEmployeeUpsertPayload | null {
  const fullName = toTrimmedString(row[COLS.fullName])
  if (!fullName) return null

  const positionTitle = toTrimmedString(row[COLS.position])
  const departmentName = toTrimmedString(row[COLS.department])

  if (!positionTitle || !departmentName) return null

  const inn = toTrimmedString(row[COLS.inn]) || undefined
  const snils = toTrimmedString(row[COLS.snils]) || undefined
  const address = toTrimmedString(row[COLS.address]) || undefined
  const citizenship = toTrimmedString(row[COLS.citizenship]) || undefined
  const professions = toTrimmedString(row[COLS.professions]) || undefined
  const education = toTrimmedString(row[COLS.education]) || undefined
  const managerPosition = toTrimmedString(row[COLS.managerPosition]) || undefined
  const birthDate = normalizeDate(row[COLS.birthDate])
  const contractEndDate = normalizeDate(row[COLS.contractEndDate])
  const anniversaryYears = parseInteger(row[COLS.anniversaryYears])
  const isContractor = parseYesNo(row[COLS.isContractor])

  return {
    fullName,
    positionTitle,
    departmentName,
    birthDate,
    contractEndDate,
    inn,
    snils,
    address,
    citizenship,
    anniversaryYears,
    professions,
    education,
    managerPosition,
    isContractor,
    status: "active",
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ["admin", "hr_manager"])
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      const payload = apiErrorSchema.parse({
        error: "Файл не передан",
        code: "FILE_REQUIRED",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      const payload = apiErrorSchema.parse({
        error: "Поддерживается только формат .xlsx",
        code: "INVALID_FILE_TYPE",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      const payload = apiErrorSchema.parse({
        error: "В Excel-файле нет листов",
        code: "EMPTY_WORKBOOK",
      })
      return NextResponse.json(payload, { status: 400 })
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })

    const headerIndex = findHeaderRowIndex(rows)
    if (headerIndex === -1) {
      const payload = apiErrorSchema.parse({
        error: "Не найдена строка-заголовок \"Сотрудник\" в первой колонке",
        code: "MISSING_COLUMNS",
        details: `Проверено ${Math.min(rows.length, HEADER_SEARCH_LIMIT)} строк`,
      })
      return NextResponse.json(payload, { status: 400 })
    }

    const validRows: AdminEmployeeUpsertPayload[] = []
    const preValidationErrors: Array<{ row: number; reason: string }> = []

    for (let i = headerIndex + 1; i < rows.length; i += 1) {
      const row = rows[i]
      if (!row || row.length === 0) continue
      const payload = buildPayloadFromRow(row)
      if (!payload) continue

      const parsed = adminEmployeeUpsertSchema.safeParse(payload)
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0]
        preValidationErrors.push({
          row: i + 1,
          reason: firstIssue ? `${firstIssue.path.join(".") || "row"}: ${firstIssue.message}` : "Некорректные данные строки",
        })
        continue
      }
      validRows.push(parsed.data)
    }

    const result = await getPortalRepositoryServer().importEmployees(validRows)
    const response = employeeImportResponseSchema.parse({
      created: result.created,
      updated: result.updated,
      errors: [...preValidationErrors, ...result.errors],
    })

    await writeAuditLog({
      userId: auth.userId,
      action: "admin:employees:import",
      resourceType: "users",
      statusCode: 200,
      metadata: JSON.stringify({
        created: response.created,
        updated: response.updated,
        errors: response.errors.length,
      }),
    })
    return NextResponse.json(response)
  } catch (error) {
    const known = error as Partial<AuthError>
    const status = known.status ?? 500
    const payload =
      status === 500
        ? apiErrorSchema.parse({ error: "Не удалось импортировать сотрудников", code: "INTERNAL_ERROR" })
        : apiErrorSchema.parse({
            error: known.message ?? "Ошибка доступа",
            code: known.code ?? "AUTH_ERROR",
          })
    return NextResponse.json(payload, { status })
  }
}
