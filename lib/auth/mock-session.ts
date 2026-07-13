import crypto from "node:crypto"
import { findMockAuthUserById } from "@/lib/auth/mock-users"

interface MockSessionRow {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
}

const sessions = new Map<string, MockSessionRow>()

function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
}

export async function mockCreateSession(params: {
  userId: string
  refreshToken: string
  expiresAt?: Date
}) {
  const id = crypto.randomUUID()
  const row: MockSessionRow = {
    id,
    userId: params.userId,
    tokenHash: hashRefreshToken(params.refreshToken),
    expiresAt: params.expiresAt ?? getRefreshTokenExpiryDate(),
    revokedAt: null,
  }
  sessions.set(id, row)
  return row
}

export async function mockValidateSession(refreshToken: string) {
  const now = new Date()
  const hash = hashRefreshToken(refreshToken)
  for (const session of sessions.values()) {
    if (session.tokenHash !== hash || session.revokedAt || session.expiresAt <= now) continue
    const user = findMockAuthUserById(session.userId)
    if (!user || !user.isActive) return null
    return {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        isActive: user.isActive,
      },
    }
  }
  return null
}

export async function mockRevokeSession(refreshToken: string) {
  const hash = hashRefreshToken(refreshToken)
  for (const session of sessions.values()) {
    if (session.tokenHash === hash) {
      session.revokedAt = new Date()
      return true
    }
  }
  return false
}

export async function mockRotateSession(params: {
  sessionId: string
  refreshToken: string
  expiresAt?: Date
}) {
  const session = sessions.get(params.sessionId)
  if (!session) return false
  session.tokenHash = hashRefreshToken(params.refreshToken)
  session.expiresAt = params.expiresAt ?? getRefreshTokenExpiryDate()
  session.revokedAt = null
  return true
}
