"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { SidebarItem } from "@/types/portal"

export function useSidebarNavigation() {
  const [items, setItems] = useState<SidebarItem[]>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const result = await getPortalRepository().getSidebarItems()
      if (mounted) setItems(result)
    })()
    return () => {
      mounted = false
    }
  }, [])

  return { items }
}
