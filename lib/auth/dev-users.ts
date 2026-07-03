import type { UserRole } from "@/types/auth"

export interface DevUser {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  departmentId: string | null
  isActive: boolean
}

/** Тестовые аккаунты для локальной разработки (USE_MOCK_DB=true). */
export const DEV_USERS: DevUser[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    email: "admin@snark.ru",
    password: "Admin2026Snark!",
    firstName: "Админ",
    lastName: "Тест",
    role: "admin",
    departmentId: null,
    isActive: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    email: "hr@snark.ru",
    password: "HR2026Snark!",
    firstName: "Анна",
    lastName: "Петрова",
    role: "hr_manager",
    departmentId: null,
    isActive: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    email: "employee@snark.ru",
    password: "Employee2026!",
    firstName: "Иван",
    lastName: "Сидоров",
    role: "employee",
    departmentId: null,
    isActive: true,
  },
]

export function findDevUser(email: string, password: string): DevUser | null {
  const normalized = email.trim().toLowerCase()
  return (
    DEV_USERS.find((user) => user.email.toLowerCase() === normalized && user.password === password) ??
    null
  )
}

export function findDevUserById(userId: string): DevUser | null {
  return DEV_USERS.find((user) => user.id === userId) ?? null
}
