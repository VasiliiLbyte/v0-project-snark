import { mkdir, writeFile } from "fs/promises"
import path from "path"

const MAX_BYTES = 20 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
])

const EXT_FALLBACK: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "application/zip": "zip",
}

export function validateTaskFile(file: File): string | null {
  if (file.size > MAX_BYTES) {
    return "Размер файла не должен превышать 20 МБ"
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return "Неподдерживаемый тип файла"
  }
  return null
}

export async function saveTaskFile(taskId: string, file: File, suffix = ""): Promise<{
  fileName: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
}> {
  const validationError = validateTaskFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const ext = EXT_FALLBACK[file.type] ?? file.name.split(".").pop() ?? "bin"
  const safeBase = file.name.replace(/[^\w.\-()а-яА-ЯёЁ\s]/g, "_").slice(0, 80)
  const fileName = safeBase || `file.${ext}`
  const storedName = `${taskId}-${suffix}${Date.now()}.${ext}`
  const dir = path.join(process.cwd(), "public", "uploads", "tasks")
  await mkdir(dir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, storedName), buffer)

  return {
    fileName,
    fileUrl: `/uploads/tasks/${storedName}`,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  }
}
