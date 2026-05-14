import type { VacationStatus, VacationType } from "@/types/portal"

export const VACATION_STATUS_LABEL: Record<
  VacationStatus,
  { label: string; classes: string }
> = {
  pending: {
    label: "На согласовании",
    classes: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
  },
  approved: {
    label: "Утверждён",
    classes: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30",
  },
  rejected: {
    label: "Отклонён",
    classes: "bg-red-500/15 text-red-700 border border-red-500/30",
  },
}

export const VACATION_TYPE_LABEL: Record<VacationType, string> = {
  annual: "Ежегодный",
  sick: "Больничный",
  unpaid: "За свой счёт",
  maternity: "Декретный",
}

export const VACATION_TYPE_OPTIONS: { value: VacationType; label: string }[] = [
  { value: "annual", label: VACATION_TYPE_LABEL.annual },
  { value: "sick", label: VACATION_TYPE_LABEL.sick },
  { value: "unpaid", label: VACATION_TYPE_LABEL.unpaid },
  { value: "maternity", label: VACATION_TYPE_LABEL.maternity },
]

export function formatVacationPeriod(startISO: string, endISO: string): string {
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startISO} — ${endISO}`
  }
  return `${formatter.format(start)} — ${formatter.format(end)}`
}
