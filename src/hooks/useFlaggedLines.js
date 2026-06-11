import { useState, useCallback } from 'react'
import { saveFlaggedLines } from '../storage/history.js'

export function useFlaggedLines(sessionId, initial = []) {
  const [flaggedLines, setFlaggedLines] = useState(() => new Set(initial))

  const toggleFlag = useCallback((lineIndex) => {
    setFlaggedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineIndex)) {
        next.delete(lineIndex)
      } else {
        next.add(lineIndex)
      }
      const sorted = [...next].sort((a, b) => a - b)
      if (sessionId) saveFlaggedLines(sessionId, sorted)
      return next
    })
  }, [sessionId])

  return { flaggedLines, toggleFlag }
}
