export interface MentionCandidate {
  userId: string
  name: string
}

/** Парсит @Фамилия Имя / @Имя по списку сотрудников (длинные имена первыми). */
export function extractMentionUserIds(
  body: string,
  employees: MentionCandidate[]
): string[] {
  const sorted = [...employees].sort((a, b) => b.name.length - a.name.length)
  const found = new Set<string>()
  let remaining = body

  for (const employee of sorted) {
    const needle = `@${employee.name}`
    const index = remaining.toLowerCase().indexOf(needle.toLowerCase())
    if (index >= 0) {
      found.add(employee.userId)
      remaining =
        remaining.slice(0, index) + " ".repeat(needle.length) + remaining.slice(index + needle.length)
    }
  }

  return Array.from(found)
}

export function highlightMentions(body: string, employees: MentionCandidate[]): string {
  // Plain helper — UI may prefer React nodes; keep for tests
  let result = body
  const sorted = [...employees].sort((a, b) => b.name.length - a.name.length)
  for (const employee of sorted) {
    const needle = `@${employee.name}`
    const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
    result = result.replace(re, (match) => `«${match}»`)
  }
  return result
}

export function splitMentions(
  body: string,
  employees: MentionCandidate[]
): Array<{ text: string; mention: boolean }> {
  if (!body) return [{ text: "", mention: false }]
  const sorted = [...employees].sort((a, b) => b.name.length - a.name.length)
  const markers: Array<{ start: number; end: number }> = []
  const lower = body.toLowerCase()

  for (const employee of sorted) {
    const needle = `@${employee.name}`.toLowerCase()
    let from = 0
    while (from < lower.length) {
      const index = lower.indexOf(needle, from)
      if (index < 0) break
      const end = index + needle.length
      const overlaps = markers.some((m) => index < m.end && end > m.start)
      if (!overlaps) markers.push({ start: index, end })
      from = end
    }
  }

  markers.sort((a, b) => a.start - b.start)
  const parts: Array<{ text: string; mention: boolean }> = []
  let cursor = 0
  for (const marker of markers) {
    if (marker.start > cursor) {
      parts.push({ text: body.slice(cursor, marker.start), mention: false })
    }
    parts.push({ text: body.slice(marker.start, marker.end), mention: true })
    cursor = marker.end
  }
  if (cursor < body.length) {
    parts.push({ text: body.slice(cursor), mention: false })
  }
  return parts.length > 0 ? parts : [{ text: body, mention: false }]
}
