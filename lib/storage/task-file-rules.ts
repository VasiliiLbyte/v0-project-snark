const MAX_BYTES = 25 * 1024 * 1024

export const TASK_FILE_MAX_BYTES = MAX_BYTES

export const TASK_FILE_ALLOWED_TYPES = new Set([
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
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
])

export const TASK_FILE_EXT_FALLBACK: Record<string, string> = {
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
  "application/x-zip-compressed": "zip",
  "application/vnd.rar": "rar",
  "application/x-rar-compressed": "rar",
  "application/x-7z-compressed": "7z",
}

export function validateTaskFile(file: Pick<File, "size" | "type">): string | null {
  if (file.size > MAX_BYTES) {
    return "Размер файла не должен превышать 25 МБ"
  }
  if (file.type && !TASK_FILE_ALLOWED_TYPES.has(file.type)) {
    return "Неподдерживаемый тип файла"
  }
  return null
}
