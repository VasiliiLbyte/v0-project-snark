export interface FioCandidate {
  id: string
  firstName: string
  lastName: string
}

/** Нормализация ФИО для точного сравнения. */
export function normalizeFio(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\./g, "")
}

/**
 * Точный матч «Фамилия Имя» (и «Имя Фамилия» как единственный альтернативный порядок).
 * 0 или >1 совпадений → null (задача без исполнителя, «требует назначения»).
 */
export function matchAssigneeExact(
  assigneeRaw: string | null | undefined,
  users: FioCandidate[]
): string | null {
  const needle = normalizeFio(assigneeRaw ?? "")
  if (!needle) return null

  const matches = users.filter((user) => {
    const lastFirst = normalizeFio(`${user.lastName} ${user.firstName}`)
    const firstLast = normalizeFio(`${user.firstName} ${user.lastName}`)
    return needle === lastFirst || needle === firstLast
  })

  if (matches.length === 1) return matches[0].id
  return null
}
