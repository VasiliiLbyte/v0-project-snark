import { redirect } from "next/navigation"
import { CalendarPageContent } from "@/components/calendar/calendar-page-content"
import { getServerSession } from "@/lib/auth/server-session"
import { loadEventsForMonth } from "@/lib/portal-data/loaders"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Календарь",
}

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export default async function CalendarPage() {
  const session = await getServerSession()
  if (!session) {
    redirect("/login")
  }
  const month = currentMonth()
  const data = await loadEventsForMonth({ month })
  return <CalendarPageContent initial={data} role={session.role} initialMonth={month} />
}
