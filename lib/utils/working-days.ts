/**
 * Counts working days (Mon-Fri) inclusive between two ISO dates (YYYY-MM-DD).
 * Public holidays are not considered.
 */
export function countWorkingDays(startISO: string, endISO: string): number {
  const start = new Date(`${startISO}T00:00:00Z`)
  const end = new Date(`${endISO}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  if (start > end) return 0
  let days = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getUTCDay()
    if (dow !== 0 && dow !== 6) days += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}
