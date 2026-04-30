"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { DashboardData } from "@/types/portal"

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPortalRepository().getDashboardData()
      setData(result)
    } catch {
      setError("Не удалось загрузить дашборд")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refetch()
  }, [])

  return { data, isLoading, error, refetch }
}
