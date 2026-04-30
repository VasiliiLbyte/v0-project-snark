"use client"

import { useEffect, useState } from "react"
import { getPortalRepository } from "@/lib/repositories/portal-repository"
import type { DocumentsData } from "@/types/portal"

export function useDocuments() {
  const [data, setData] = useState<DocumentsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await getPortalRepository().getDocumentsData()
      setData(result)
    } catch {
      setError("Не удалось загрузить документы")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void refetch()
  }, [])

  return { data, isLoading, error, refetch }
}
