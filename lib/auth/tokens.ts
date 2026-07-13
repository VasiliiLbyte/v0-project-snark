import jwt, { type JwtPayload } from "jsonwebtoken"
import type { UserRole } from "@/types/auth"

export const ACCESS_TOKEN_COOKIE = "access_token"
export const REFRESH_TOKEN_COOKIE = "refresh_token"
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60
let cookieConfigWarningShown = false

type CookieSameSite = "lax" | "strict"

export interface AuthCookieConfig {
  httpOnly: true
  secure: boolean
  sameSite: CookieSameSite
  path: "/"
  maxAge: number
}

export interface AccessTokenPayload extends JwtPayload {
  userId: string
  email: string
  role: UserRole
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string
}

export interface CookieEnv {
  NODE_ENV?: string
  COOKIE_SECURE?: string
}

/** Чистая функция для тестов и рантайма. */
export function resolveCookieSecure(env: CookieEnv = process.env): boolean {
  if (env.COOKIE_SECURE === "true") return true
  if (env.COOKIE_SECURE === "false") return false
  return env.NODE_ENV === "production"
}

function getSameSite(env: CookieEnv = process.env): CookieSameSite {
  return env.NODE_ENV === "production" ? "strict" : "lax"
}

export function validateCookieConfig(
  maxAge: number,
  env: CookieEnv = process.env
): AuthCookieConfig {
  const secure = resolveCookieSecure(env)
  const sameSite = getSameSite(env)
  const config: AuthCookieConfig = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge,
  }

  if (
    env.NODE_ENV === "production" &&
    env.COOKIE_SECURE === "false" &&
    !cookieConfigWarningShown
  ) {
    cookieConfigWarningShown = true
    console.warn(
      "[auth] COOKIE_SECURE=false при NODE_ENV=production: cookies без Secure (допустимо только за HTTP без TLS)."
    )
  }

  return config
}

/** Сброс флага предупреждения (unit-тесты). */
export function resetCookieConfigWarningForTests(): void {
  cookieConfigWarningShown = false
}

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not set")
  }
  return secret
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not set")
  }
  return secret
}

export function generateAccessToken(payload: {
  userId: string
  email: string
  role: UserRole
}): string {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_TOKEN_TTL_SECONDS })
}

export function generateRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_TOKEN_TTL_SECONDS })
}

export function verifyToken<T extends JwtPayload>(
  token: string,
  tokenType: "access" | "refresh"
): T {
  const secret = tokenType === "access" ? getAccessSecret() : getRefreshSecret()
  return jwt.verify(token, secret) as T
}
