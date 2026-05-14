"use client"

import { Card } from "@/components/ui/card"
import type { NewEmployeeItem } from "@/types/portal"

interface NewEmployeesWidgetProps {
  items: NewEmployeeItem[]
}

const AVATAR_PALETTE = [
  "bg-accent text-accent-foreground",
  "bg-success text-success-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-destructive text-destructive-foreground",
] as const

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  const first = parts[0]?.charAt(0) ?? ""
  const second = parts[1]?.charAt(0) ?? ""
  return `${first}${second}`.toUpperCase() || "?"
}

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function formatDaysAgo(days: number): string {
  const abs = Math.abs(days)
  const mod100 = abs % 100
  const mod10 = abs % 10
  if (mod100 >= 11 && mod100 <= 14) return `${abs} дней`
  if (mod10 === 1) return `${abs} день`
  if (mod10 >= 2 && mod10 <= 4) return `${abs} дня`
  return `${abs} дней`
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function formatHireDate(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso

  const today = startOfDay(new Date())
  const hire = startOfDay(parsed)
  const diffDays = Math.round((today.getTime() - hire.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays < 0) {
    const day = String(hire.getDate()).padStart(2, "0")
    const month = String(hire.getMonth() + 1).padStart(2, "0")
    const year = hire.getFullYear()
    return `Выходит ${day}.${month}.${year}`
  }
  if (diffDays === 0) return "Вышел сегодня"
  return `Вышел ${formatDaysAgo(diffDays)} назад`
}

function PersonAvatar({ person }: { person: NewEmployeeItem }) {
  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatarUrl}
        alt={`Аватар сотрудника ${person.name}`}
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    )
  }
  const palette = colorFromName(person.name)
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${palette}`}
      aria-hidden="true"
    >
      {person.avatar || initialsFromName(person.name)}
    </div>
  )
}

export function NewEmployeesWidget({ items }: NewEmployeesWidgetProps) {
  return (
    <Card className="p-4" role="region" aria-label="Новые коллеги">
      <h3 className="mb-4 flex items-center gap-2 font-bold text-card-foreground">
        <span aria-hidden="true">👋</span>
        <span>Новые коллеги</span>
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Новых сотрудников пока нет</p>
      ) : (
        <ul className="space-y-4">
          {items.map((person) => (
            <li key={person.id} className="space-y-2">
              <div className="flex items-start gap-3">
                <PersonAvatar person={person} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-card-foreground">
                    {person.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{person.position}</p>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {formatHireDate(person.startDate)}
                  </p>
                </div>
              </div>
              {person.welcomeText && (
                <blockquote className="border-l-2 border-primary/30 pl-3 text-xs italic text-muted-foreground">
                  «{person.welcomeText}»
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
