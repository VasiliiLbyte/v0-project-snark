import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getStorageConfig } from "@/lib/storage/config"
import { getFileStorage } from "@/lib/storage/index"
import {
  TASK_FILE_EXT_FALLBACK,
  validateTaskFile,
} from "@/lib/storage/task-file-rules"

export { validateTaskFile } from "@/lib/storage/task-file-rules"

function isRealStorage(): boolean {
  const config = getStorageConfig()
  return (
    !!config.accessKeyId &&
    config.accessKeyId !== "mock" &&
    config.accessKeyId !== "replace-with-s3-access-key"
  )
}

export async function saveTaskFile(
  taskId: string,
  file: File,
  suffix = ""
): Promise<{
  fileName: string
  fileUrl: string
  mimeType: string
  sizeBytes: number
}> {
  const validationError = validateTaskFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const ext = TASK_FILE_EXT_FALLBACK[file.type] ?? file.name.split(".").pop() ?? "bin"
  const safeBase = file.name.replace(/[^\w.\-()а-яА-ЯёЁ\s]/g, "_").slice(0, 80)
  const fileName = safeBase || `file.${ext}`
  const objectKey = `tasks/${taskId}/${suffix}${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const mimeType = file.type || "application/octet-stream"

  if (isRealStorage()) {
    const config = getStorageConfig()
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId ?? "",
        secretAccessKey: config.secretAccessKey ?? "",
      },
      forcePathStyle: true,
    })
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
      })
    )
    return { fileName, fileUrl: objectKey, mimeType, sizeBytes: file.size }
  }

  const dir = path.join(process.cwd(), "public", "uploads", "tasks")
  await mkdir(dir, { recursive: true })
  const storedName = `${taskId}-${suffix}${Date.now()}.${ext}`
  await writeFile(path.join(dir, storedName), buffer)
  return {
    fileName,
    fileUrl: `/uploads/tasks/${storedName}`,
    mimeType,
    sizeBytes: file.size,
  }
}

/** Presigned GET или локальный путь для скачивания. */
export async function resolveTaskAttachmentDownloadUrl(fileUrl: string): Promise<string> {
  if (fileUrl.startsWith("/") || fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl
  }
  return getFileStorage().getPreviewUrl(fileUrl)
}
