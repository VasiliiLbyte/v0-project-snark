import "server-only"
import { headers } from "next/headers"
import type { UserRole } from "@/types/auth"

export interface ServerSession {
  userId: string
  role: UserRole
}

function isValidRole(value: string): value is UserRole {
  return value === "admin" || value === "hr_manager" || value === "employee"
}

export async function getServerSession(): Promise<ServerSession | null> {
  const requestHeaders = await headers()
  const userId = requestHeaders.get("x-user-id")
  const role = requestHeaders.get("x-user-role")
  if (!userId || !role || !isValidRole(role)) return null
  return { userId, role }
}
