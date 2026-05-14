"use client"

import { useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EmployeeImportResult } from "@/types/portal"

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
  birthDateLabel: 28,
  professions: 29,
  age: 30,
  education: 31,
  managerPosition: 32,
  contractEndDate: 33,
  isContractor: 34,
} as const

const PREVIEW_COLUMNS: Array<{ label: string; col: number }> = [
  { label: "ФИО", col: COLS.fullName },
  { label: "Подразделение", col: COLS.department },
  { label: "Должность", col: COLS.position },
  { label: "ИНН", col: COLS.inn },
  { label: "Дата рождения", col: COLS.birthDate },
]

const HEADER_MARKER = "сотрудник"

type CellValue = string | number | boolean | Date | null | undefined
type SheetRow = CellValue[]

interface EmployeeImportProps {
  onImported?: () => void
}

function toDisplay(value: CellValue): string {
  if (value === null || value === undefined) return ""
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? ""
      : `${String(value.getDate()).padStart(2, "0")}.${String(value.getMonth() + 1).padStart(2, "0")}.${value.getFullYear()}`
  }
  return String(value).trim()
}

function findHeaderRow(rows: SheetRow[]): number {
  const limit = Math.min(rows.length, 200)
  for (let i = 0; i < limit; i += 1) {
    const cell = rows[i]?.[COLS.fullName]
    if (cell !== null && cell !== undefined && String(cell).trim().toLowerCase() === HEADER_MARKER) {
      return i
    }
  }
  return -1
}

function parseFileToPreview(file: File): Promise<SheetRow[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) return []
    const worksheet = workbook.Sheets[firstSheetName]
    const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: false,
    })

    const headerIndex = findHeaderRow(rows)
    if (headerIndex === -1) return []

    const result: SheetRow[] = []
    for (let i = headerIndex + 1; i < rows.length && result.length < 5; i += 1) {
      const row = rows[i]
      if (!row) continue
      const fullName = toDisplay(row[COLS.fullName])
      if (!fullName) continue
      result.push(row)
    }
    return result
  })
}

function buildTemplateRow(): Array<string> {
  const maxIndex = Math.max(...Object.values(COLS))
  const headers: string[] = Array.from({ length: maxIndex + 1 }, () => "")
  headers[COLS.fullName] = "Сотрудник"
  headers[COLS.department] = "Подразделение"
  headers[COLS.position] = "Должность"
  headers[COLS.inn] = "ИНН"
  headers[COLS.snils] = "СНИЛС"
  headers[COLS.birthDate] = "Дата рождения"
  headers[COLS.address] = "Адрес"
  headers[COLS.citizenship] = "Гражданство"
  headers[COLS.anniversaryYears] = "Юбилей (лет)"
  headers[COLS.birthDateLabel] = "День рождения"
  headers[COLS.professions] = "Профессии"
  headers[COLS.age] = "Возраст"
  headers[COLS.education] = "Образование"
  headers[COLS.managerPosition] = "Должность руководителя"
  headers[COLS.contractEndDate] = "Дата окончания договора"
  headers[COLS.isContractor] = "Оформлен по ТД (Да/Нет)"
  return headers
}

function buildTemplateExample(): Array<string> {
  const maxIndex = Math.max(...Object.values(COLS))
  const example: string[] = Array.from({ length: maxIndex + 1 }, () => "")
  example[COLS.fullName] = "Иванов Иван Иванович"
  example[COLS.department] = "Управление"
  example[COLS.position] = "Главный специалист"
  example[COLS.inn] = "770700070707"
  example[COLS.snils] = "123-456-789 00"
  example[COLS.birthDate] = "01.01.1985"
  example[COLS.address] = "г. Москва, ул. Примерная, д. 1"
  example[COLS.citizenship] = "РФ"
  example[COLS.anniversaryYears] = "40"
  example[COLS.professions] = "Электрик; Монтажник"
  example[COLS.education] = "Высшее техническое"
  example[COLS.managerPosition] = "Руководитель подразделения"
  example[COLS.contractEndDate] = "31.12.2026"
  example[COLS.isContractor] = "Да"
  return example
}

export function EmployeeImport({ onImported }: EmployeeImportProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<SheetRow[]>([])
  const [result, setResult] = useState<EmployeeImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasPreview = useMemo(() => previewRows.length > 0, [previewRows.length])

  const handleTemplateDownload = () => {
    const sheet = XLSX.utils.aoa_to_sheet([buildTemplateRow(), buildTemplateExample()])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, "Сотрудники")
    XLSX.writeFile(workbook, "employee-import-template.xlsx")
  }

  const handleFileChange = async (picked: File | null) => {
    setResult(null)
    setError(null)
    setFile(picked)
    if (!picked) {
      setPreviewRows([])
      return
    }
    if (!picked.name.toLowerCase().endsWith(".xlsx")) {
      setError("Поддерживаются только .xlsx файлы.")
      setPreviewRows([])
      return
    }

    try {
      const rows = await parseFileToPreview(picked)
      if (rows.length === 0) {
        setError(
          "Не удалось распознать шаблон: в первой колонке должна быть строка-заголовок \"Сотрудник\".",
        )
      }
      setPreviewRows(rows)
    } catch {
      setError("Не удалось прочитать файл. Проверьте формат.")
      setPreviewRows([])
    }
  }

  const handleImport = async () => {
    if (!file) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/admin/employees/import", {
        method: "POST",
        body: formData,
      })
      const body = (await response.json()) as EmployeeImportResult & { error?: string }
      if (!response.ok) {
        setError(body.error ?? "Не удалось импортировать сотрудников.")
        return
      }
      setResult(body)
      onImported?.()
    } catch {
      setError("Ошибка сети при импорте.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="rounded-lg border border-dashed border-[#16223b]/40 p-4">
        <p className="text-sm font-medium text-card-foreground">Загрузите Excel-файл сотрудников</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Поддерживается только формат .xlsx. В первой колонке должна быть строка-заголовок «Сотрудник», далее идут
          строки данных.
        </p>
        <Input
          className="mt-3"
          type="file"
          accept=".xlsx"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleTemplateDownload}>
          Скачать шаблон
        </Button>
        <Button type="button" onClick={handleImport} disabled={!file || isLoading}>
          {isLoading ? "Импорт..." : "Импортировать"}
        </Button>
      </div>

      {hasPreview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-card-foreground">Превью первых строк</p>
          <Table>
            <TableHeader>
              <TableRow>
                {PREVIEW_COLUMNS.map((column) => (
                  <TableHead key={column.label}>{column.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, index) => (
                <TableRow key={`row-${index}`}>
                  {PREVIEW_COLUMNS.map((column) => (
                    <TableCell key={column.label}>{toDisplay(row[column.col]) || "-"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-sm font-medium text-card-foreground">Результат импорта</p>
          <p className="text-sm text-card-foreground">Добавлено: {result.created}</p>
          <p className="text-sm text-card-foreground">Обновлено: {result.updated}</p>
          <p className="text-sm text-card-foreground">Ошибок: {result.errors.length}</p>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {result.errors.slice(0, 10).map((item, index) => (
                <li key={`${item.row}-${index}`}>
                  Строка {item.row}: {item.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
