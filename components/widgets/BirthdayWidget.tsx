"use client"

import { Cake, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import type { BirthdayPerson, BirthdaysData } from "@/types/portal"

interface BirthdayWidgetProps {
  data: BirthdaysData
}

function formatYears(age: number): string {
  const abs = Math.abs(age)
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return `${age} лет`
  if (mod10 === 1) return `${age} год`
  if (mod10 >= 2 && mod10 <= 4) return `${age} года`
  return `${age} лет`
}

function formatBirthdayShort(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}.${month}`
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  const first = parts[0]?.charAt(0) ?? ""
  const second = parts[1]?.charAt(0) ?? ""
  return `${first}${second}`.toUpperCase() || "?"
}

function PersonAvatar({ person, size = 40 }: { person: BirthdayPerson; size?: number }) {
  const dimension = `${size}px`
  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatarUrl}
        alt={`Аватар сотрудника ${person.name}`}
        className="shrink-0 rounded-full object-cover"
        style={{ width: dimension, height: dimension }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
      style={{ width: dimension, height: dimension }}
      aria-hidden="true"
    >
      {person.avatar || initialsFromName(person.name)}
    </div>
  )
}

export function BirthdayWidget({ data }: BirthdayWidgetProps) {
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false)
  const hasToday = data.today.length > 0
  const hasThisWeek = data.thisWeek.length > 0
  const hasUpcoming = data.upcoming.length > 0

  return (
    <Card
      className="relative overflow-hidden p-4"
      role="region"
      aria-label="Именинники"
    >
      {hasToday && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="birthday-confetti birthday-confetti-1" />
          <span className="birthday-confetti birthday-confetti-2" />
          <span className="birthday-confetti birthday-confetti-3" />
          <span className="birthday-confetti birthday-confetti-4" />
          <span className="birthday-confetti birthday-confetti-5" />
        </div>
      )}

      <div className="relative">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-card-foreground">
          <Cake className="h-5 w-5 text-primary" aria-hidden="true" />
          <span>Именинники</span>
        </h3>

        <section className="mb-4" aria-label="Именинники сегодня">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span aria-hidden="true">🎂</span>
            <span>Именинники сегодня</span>
          </div>
          {hasToday ? (
            <ul className="space-y-2">
              {data.today.map((person) => (
                <li
                  key={person.id}
                  className="birthday-card-today flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <PersonAvatar person={person} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.department}
                    </p>
                  </div>
                  <span
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                    aria-label={`Исполнилось ${formatYears(person.age)}`}
                  >
                    {formatYears(person.age)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Сегодня именинников нет</p>
          )}
        </section>

        {hasThisWeek && (
          <section className="mb-4" aria-label="Скоро день рождения">
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              Скоро день рождения
            </div>
            <ul className="space-y-2">
              {data.thisWeek.map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <PersonAvatar person={person} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-card-foreground">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.department}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {formatBirthdayShort(person.birthDate)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasUpcoming && (
          <section aria-label="В ближайший месяц">
            <button
              type="button"
              onClick={() => setIsUpcomingOpen((open) => !open)}
              aria-expanded={isUpcomingOpen}
              className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>В ближайший месяц ({data.upcoming.length})</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isUpcomingOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {isUpcomingOpen && (
              <ul className="mt-2 space-y-2">
                {data.upcoming.map((person) => (
                  <li key={person.id} className="flex items-center gap-3">
                    <PersonAvatar person={person} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-card-foreground">{person.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {person.department}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBirthdayShort(person.birthDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </Card>
  )
}
