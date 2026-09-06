import { useCallback, useRef } from 'react'

export function useSubmitGuard() {
  const isSubmittingRef = useRef(false)

  const runGuarded = useCallback(async (callback) => {
    if (isSubmittingRef.current) return false

    isSubmittingRef.current = true
    try {
      await callback()
      return true
    } finally {
      isSubmittingRef.current = false
    }
  }, [])

  return { isSubmittingRef, runGuarded }
}
