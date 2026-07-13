"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { SidebarItem } from "@/types/portal"

export function useSidebarNavigation() {
  const [items, setItems] = useState<SidebarItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const [result, statsRes] = await Promise.all([
        getPortalRepository().getSidebarItems(),
        fetch("/api/tasks/stats").catch(() => null),
      ])
      let overdueCount = 0
      if (statsRes?.ok) {
        const stats = (await statsRes.json()) as { overdueCount?: number }
        overdueCount = Number(stats.overdueCount ?? 0)
      }
      if (mounted) {
        setItems(
          result.map((item) =>
            item.id === "tasks" && overdueCount > 0 ? { ...item, badge: overdueCount } : item
          )
        )
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return { items }
}
