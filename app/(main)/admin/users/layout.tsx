import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  if (h.get("x-user-role") !== "admin") {
    redirect("/admin")
  }
  return children
}
