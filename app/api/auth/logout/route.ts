import { NextResponse } from "next/server"
import { isMockAuth } from "@/lib/config/mode"
import { mockRevokeSession } from "@/lib/auth/mock-session"
import { revokeSession } from "@/lib/auth/session"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth/tokens"

function clearAuthCookies(response: NextResponse) {
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { path: "/", maxAge: 0 })
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { path: "/", maxAge: 0 })
}

export async function POST(request: Request) {
  try {
    const refreshToken = request.headers.get("cookie")
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${REFRESH_TOKEN_COOKIE}=`))
      ?.split("=")[1]

    if (refreshToken) {
      if (isMockAuth()) {
        await mockRevokeSession(refreshToken)
      } else {
        await revokeSession(refreshToken)
      }
    }

    const response = NextResponse.json({ success: true })
    clearAuthCookies(response)
    return response
  } catch {
    const response = NextResponse.json({ success: true })
    clearAuthCookies(response)
    return response
  }
}
