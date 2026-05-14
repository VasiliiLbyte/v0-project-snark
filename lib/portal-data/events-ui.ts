import type { EventCategory } from "@/types/portal"

export const EVENT_CATEGORY_LABEL: Record<EventCategory, string> = {
  meeting: "Встреча",
  birthday: "День рождения",
  corporate: "Корпоративное",
  deadline: "Дедлайн",
  holiday: "Выходной",
}

export const EVENT_CATEGORY_DOT: Record<EventCategory, string> = {
  meeting: "bg-blue-500",
  birthday: "bg-pink-500",
  corporate: "bg-emerald-500",
  deadline: "bg-red-500",
  holiday: "bg-orange-500",
}

export const EVENT_CATEGORY_BADGE: Record<EventCategory, string> = {
  meeting: "bg-blue-500/15 text-blue-700",
  birthday: "bg-pink-500/15 text-pink-700",
  corporate: "bg-emerald-500/15 text-emerald-700",
  deadline: "bg-red-500/15 text-red-700",
  holiday: "bg-orange-500/15 text-orange-700",
}

export const EVENT_CATEGORY_OPTIONS: EventCategory[] = [
  "meeting",
  "corporate",
  "deadline",
  "holiday",
  "birthday",
]
