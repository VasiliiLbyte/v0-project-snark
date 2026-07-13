import type { UserRole } from "@/types/auth"

export interface MockAuthUser {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  departmentId: string | null
  isActive: boolean
}

const DEFAULT_IDS = {
  admin: "00000000-0000-0000-0000-000000000001",
  hr: "00000000-0000-0000-0000-000000000002",
  employee: "00000000-0000-0000-0000-000000000003",
} as const

/**
 * Учётки mock-режима только из env (.env.local), не из git.
 * Без заданных паролей mock-login вернёт 401.
 */
export function loadMockAuthUsers(env: NodeJS.ProcessEnv = process.env): MockAuthUser[] {
  const slots: Array<{
    idKey: keyof typeof DEFAULT_IDS
    emailEnv: string
    passwordEnv: string
    firstName: string
    lastName: string
    role: UserRole
    defaultEmail: string
  }> = [
    {
      idKey: "admin",
      emailEnv: "DEV_ADMIN_EMAIL",
      passwordEnv: "DEV_ADMIN_PASSWORD",
      firstName: "Админ",
      lastName: "Тест",
      role: "admin",
      defaultEmail: "admin@snark.ru",
    },
    {
      idKey: "hr",
      emailEnv: "DEV_HR_EMAIL",
      passwordEnv: "DEV_HR_PASSWORD",
      firstName: "Анна",
      lastName: "Петрова",
      role: "hr_manager",
      defaultEmail: "hr@snark.ru",
    },
    {
      idKey: "employee",
      emailEnv: "DEV_EMPLOYEE_EMAIL",
      passwordEnv: "DEV_EMPLOYEE_PASSWORD",
      firstName: "Иван",
      lastName: "Сидоров",
      role: "employee",
      defaultEmail: "employee@snark.ru",
    },
  ]

  const users: MockAuthUser[] = []
  for (const slot of slots) {
    const password = env[slot.passwordEnv]?.trim()
    if (!password) continue
    users.push({
      id: env[`DEV_${slot.idKey.toUpperCase()}_ID`]?.trim() || DEFAULT_IDS[slot.idKey],
      email: (env[slot.emailEnv]?.trim() || slot.defaultEmail).toLowerCase(),
      password,
      firstName: slot.firstName,
      lastName: slot.lastName,
      role: slot.role,
      departmentId: null,
      isActive: true,
    })
  }
  return users
}

export function findMockAuthUser(
  email: string,
  password: string,
  env: NodeJS.ProcessEnv = process.env
): MockAuthUser | null {
  const normalized = email.trim().toLowerCase()
  return (
    loadMockAuthUsers(env).find(
      (user) => user.email.toLowerCase() === normalized && user.password === password
    ) ?? null
  )
}

export function findMockAuthUserById(
  userId: string,
  env: NodeJS.ProcessEnv = process.env
): MockAuthUser | null {
  return loadMockAuthUsers(env).find((user) => user.id === userId) ?? null
}

/** Имена для mock-чата без паролей (по фиксированным UUID + env email). */
export function mockDisplayName(userId: string, env: NodeJS.ProcessEnv = process.env): string {
  const user = findMockAuthUserById(userId, env)
  if (user) return `${user.lastName} ${user.firstName}`.trim()
  return "Сотрудник"
}
