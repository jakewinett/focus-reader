import { useState, useEffect } from 'react'
import { useAppAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'

// Free tier limits
export const FREE_DOCS_PER_MONTH = 20
export const FREE_SUMMARIES_PER_DOC = 1
export const FREE_QUIZZES_PER_DOC = 2

export function useSubscription() {
  const { userId, isLoaded } = useAppAuth()
  const [tier, setTier]         = useState('free')   // 'free' | 'student' | 'standard'
  const [status, setStatus]     = useState('active') // 'active' | 'past_due' | 'canceled'
  const [loading, setLoading]   = useState(true)
  const [docsThisMonth, setDocsThisMonth] = useState(0)

  useEffect(() => {
    if (!isLoaded || !userId) { setLoading(false); return }

    async function load() {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('tier, status, current_period_end')
        .eq('user_id', userId)
        .maybeSingle()

      if (sub && sub.status === 'active') {
        setTier(sub.tier)
        setStatus(sub.status)
      }

      // Count docs uploaded this calendar month
      const start = new Date()
      start.setDate(1); start.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', start.toISOString())

      setDocsThisMonth(count ?? 0)
      setLoading(false)
    }

    load()
  }, [isLoaded, userId])

  const isPaid    = tier !== 'free'
  const isStudent = tier === 'student'

  function canUploadDoc() {
    if (isPaid) return true
    return docsThisMonth < FREE_DOCS_PER_MONTH
  }

  function canUseSummary(summariesUsedOnDoc) {
    if (isPaid) return true
    return summariesUsedOnDoc < FREE_SUMMARIES_PER_DOC
  }

  function canUseQuiz(quizzesUsedOnDoc) {
    if (isPaid) return true
    return quizzesUsedOnDoc < FREE_QUIZZES_PER_DOC
  }

  return {
    tier, status, loading, isPaid, isStudent,
    docsThisMonth,
    canUploadDoc, canUseSummary, canUseQuiz,
  }
}
