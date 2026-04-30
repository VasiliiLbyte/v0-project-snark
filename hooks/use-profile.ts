"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { ProfileData } from "@/types/portal"

export function useProfile() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPortalRepository().getProfileData()
      setData(result)
    } catch {
      setError("Не удалось загрузить профиль")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refetch()
  }, [])

  return { data, isLoading, error, refetch }
}
