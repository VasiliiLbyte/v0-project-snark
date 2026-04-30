"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { ContactsData } from "@/types/portal"

export function useContacts() {
  const [data, setData] = useState<ContactsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPortalRepository().getContactsData()
      setData(result)
    } catch {
      setError("Не удалось загрузить справочник сотрудников")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refetch()
  }, [])

  return { data, isLoading, error, refetch }
}
