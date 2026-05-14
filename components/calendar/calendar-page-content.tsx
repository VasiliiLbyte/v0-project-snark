"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  EVENT_CATEGORY_BADGE,
  EVENT_CATEGORY_DOT,
  EVENT_CATEGORY_LABEL,
} from "@/lib/portal-data/events-ui"
import type { CalendarEvent, EventsListResponse } from "@/types/portal"
import type { UserRole } from "@/types/auth"
import { EventCreateDialog } from "@/components/calendar/event-create-dialog"

interface CalendarPageContentProps {
  initial: EventsListResponse
  role: UserRole
  initialMonth: string
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const MONTH_TITLE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
})
const DAY_TITLE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  weekday: "long",
})

function isManager(role: UserRole): boolean {
  return role === "admin" || role === "hr_manager"
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split("-")
  return { year: Number(y), monthIndex: Number(m) - 1 }
}

function formatMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

function addMonths(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month)
  const date = new Date(Date.UTC(year, monthIndex + delta, 1))
  return formatMonth(date.getUTCFullYear(), date.getUTCMonth())
}

function dayIso(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function todayIso(): string {
  const now = new Date()
  return dayIso(now.getFullYear(), now.getMonth(), now.getDate())
}

function formatTimeRange(event: CalendarEvent): string | null {
  if (event.isAllDay) return null
  try {
    const start = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(event.startAt)
    )
    if (!event.endAt) return start
    const end = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(event.endAt)
    )
    return `${start} – ${end}`
  } catch {
    return null
  }
}

function formatListDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function CalendarPageContent({ initial, role, initialMonth }: CalendarPageContentProps) {
  const [month, setMonth] = useState(initialMonth)
  const [view, setView] = useState<"month" | "list">("month")
  const [events, setEvents] = useState<CalendarEvent[]>(initial.items)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const canManage = isManager(role)

  const refetch = useCallback(
    async (nextMonth: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/events?month=${encodeURIComponent(nextMonth)}`)
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          setError(body.error ?? "Не удалось загрузить события")
          return
        }
        const data = (await response.json()) as EventsListResponse
        setEvents(data.items)
      } catch {
        setError("Сетевая ошибка при загрузке событий")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (month === initialMonth) return
    void refetch(month)
  }, [month, initialMonth, refetch])

  const monthTitle = useMemo(() => {
    const { year, monthIndex } = parseMonth(month)
    const date = new Date(Date.UTC(year, monthIndex, 1))
    const title = MONTH_TITLE_FORMATTER.format(date)
    return title.charAt(0).toUpperCase() + title.slice(1)
  }, [month])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const start = new Date(event.startAt)
      const iso = dayIso(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
      const bucket = map.get(iso)
      if (bucket) bucket.push(event)
      else map.set(iso, [event])
    }
    return map
  }, [events])

  const selectedDayEvents = selectedDay ? eventsByDay.get(selectedDay) ?? [] : []

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Удалить это событие?")) return
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? "Не удалось удалить событие")
        return
      }
      await refetch(month)
    } catch {
      setError("Сетевая ошибка при удалении события")
    }
  }

  const handleCreated = async () => {
    setCreateOpen(false)
    await refetch(month)
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Предыдущий месяц"
              onClick={() => setMonth((current) => addMonths(current, -1))}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="min-w-[180px] text-center text-xl font-semibold text-card-foreground">
              {monthTitle}
            </h1>
            <Button
              variant="outline"
              size="icon"
              aria-label="Следующий месяц"
              onClick={() => setMonth((current) => addMonths(current, 1))}
              disabled={loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-input p-0.5">
              <Button
                variant={view === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("month")}
              >
                Месяц
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
              >
                Список
              </Button>
            </div>

            {canManage ? (
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Добавить событие
              </Button>
            ) : null}
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <div className="mt-4">
          {view === "month" ? (
            <MonthGridView
              month={month}
              eventsByDay={eventsByDay}
              onSelectDay={(iso) => setSelectedDay(iso)}
            />
          ) : (
            <EventsListView events={events} />
          )}
        </div>
      </Card>

      <Dialog
        open={selectedDay !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDay(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? DAY_TITLE_FORMATTER.format(new Date(`${selectedDay}T00:00:00Z`)) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDayEvents.length === 0
                ? "В этот день событий нет"
                : `Событий: ${selectedDayEvents.length}`}
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-3">
            {selectedDayEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{event.title}</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_CATEGORY_BADGE[event.category]}`}
                    >
                      {EVENT_CATEGORY_LABEL[event.category]}
                    </span>
                  </div>
                  {formatTimeRange(event) ? (
                    <p className="text-sm text-muted-foreground">{formatTimeRange(event)}</p>
                  ) : null}
                  {event.location ? (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {event.location}
                    </p>
                  ) : null}
                  {event.description ? (
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  ) : null}
                </div>
                {canManage && !event.isVirtual ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Удалить событие"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {canManage ? (
        <EventCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultMonth={month}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  )
}

interface MonthGridViewProps {
  month: string
  eventsByDay: Map<string, CalendarEvent[]>
  onSelectDay: (iso: string) => void
}

function MonthGridView({ month, eventsByDay, onSelectDay }: MonthGridViewProps) {
  const { year, monthIndex } = parseMonth(month)
  const firstOfMonth = new Date(Date.UTC(year, monthIndex, 1))
  const weekdayMondayBased = (firstOfMonth.getUTCDay() + 6) % 7
  const startDate = new Date(firstOfMonth)
  startDate.setUTCDate(startDate.getUTCDate() - weekdayMondayBased)

  const days: Array<{ iso: string; date: number; inMonth: boolean }> = []
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(startDate)
    d.setUTCDate(startDate.getUTCDate() + i)
    days.push({
      iso: dayIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      date: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex && d.getUTCFullYear() === year,
    })
  }

  const today = todayIso()

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day.iso) ?? []
          const categories = Array.from(new Set(dayEvents.map((event) => event.category)))
          const visibleDots = categories.slice(0, 3)
          const extraCount = categories.length - visibleDots.length
          const isToday = day.iso === today
          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => onSelectDay(day.iso)}
              className={`flex min-h-[88px] flex-col rounded-md border p-2 text-left transition hover:border-primary/50 hover:bg-accent/30 ${
                day.inMonth ? "" : "opacity-40"
              } ${isToday ? "border-2 border-primary" : "border-border"}`}
              aria-label={`Открыть события на ${day.date}`}
            >
              <span
                className={`text-sm ${isToday ? "font-semibold text-primary" : "text-foreground"}`}
              >
                {day.date}
              </span>
              {dayEvents.length > 0 ? (
                <div className="mt-auto flex items-center gap-1">
                  {visibleDots.map((category) => (
                    <span
                      key={category}
                      className={`h-2 w-2 rounded-full ${EVENT_CATEGORY_DOT[category]}`}
                      aria-hidden="true"
                    />
                  ))}
                  {extraCount > 0 ? (
                    <span className="text-[10px] text-muted-foreground">+{extraCount}</span>
                  ) : null}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface EventsListViewProps {
  events: CalendarEvent[]
}

function EventsListView({ events }: EventsListViewProps) {
  const now = new Date()
  const upcoming = events
    .filter((event) => new Date(event.startAt) >= new Date(now.toISOString().slice(0, 10)))
    .slice()
    .sort((a, b) => (a.startAt < b.startAt ? -1 : 1))
    .slice(0, 30)

  if (upcoming.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ближайших событий пока нет.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {upcoming.map((event) => {
        const time = formatTimeRange(event)
        return (
          <li key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="w-32 shrink-0 text-sm text-muted-foreground">
              <span className="block font-medium text-foreground">{formatListDate(event.startAt)}</span>
              {time ? <span>{time}</span> : <span>Весь день</span>}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{event.title}</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_CATEGORY_BADGE[event.category]}`}
                >
                  {EVENT_CATEGORY_LABEL[event.category]}
                </span>
              </div>
              {event.location ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {event.location}
                </p>
              ) : null}
              {event.description ? (
                <p className="text-sm text-muted-foreground">{event.description}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
