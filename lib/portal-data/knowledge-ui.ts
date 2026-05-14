import { BookOpen, GraduationCap, Monitor, Shield, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { KnowledgeCategory } from "@/types/portal"

export interface KnowledgeCategoryDefinition {
  value: KnowledgeCategory
  label: string
  icon: LucideIcon
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategoryDefinition[] = [
  { value: "onboarding", label: "Для новичков", icon: GraduationCap },
  { value: "it", label: "ИТ-инструкции", icon: Monitor },
  { value: "hr", label: "HR-процедуры", icon: Users },
  { value: "safety", label: "Безопасность", icon: Shield },
  { value: "general", label: "Общее", icon: BookOpen },
]

export const KNOWLEDGE_CATEGORY_LABEL: Record<KnowledgeCategory, string> = KNOWLEDGE_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.value] = item.label
    return acc
  },
  {} as Record<KnowledgeCategory, string>
)

const RU_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

export function formatKnowledgeDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return RU_DATE_FORMATTER.format(date)
}

export function getKnowledgeCategoryIcon(category: KnowledgeCategory): LucideIcon {
  return KNOWLEDGE_CATEGORIES.find((item) => item.value === category)?.icon ?? BookOpen
}
