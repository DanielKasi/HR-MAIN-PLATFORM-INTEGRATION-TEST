"use client"

import { useState, useEffect } from "react"
import {Branch} from "@/app/types"
import { apiGet } from "@/lib/apiRequest"

interface UseBranchesProps {
  institutionId: number | null
}

export function useBranches({ institutionId }: UseBranchesProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!institutionId) {
      setBranches([])
      return
    }

    const fetchBranches = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await apiGet(`/institution/${institutionId}/branch`)

        if (response.status !== 200) {
          throw new Error("Failed to fetch branches")
        }

        const data = await response.data.results
        setBranches(Array.isArray(data) ? data : [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch branches"
        setError(errorMessage)
        setBranches([])
      } finally {
        setLoading(false)
      }
    }

    fetchBranches()
  }, [institutionId])

  return { branches, loading, error }
}
