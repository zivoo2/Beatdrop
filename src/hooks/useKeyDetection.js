import { useCallback, useState } from 'react'
import { analyzeMusicalKey } from '../utils/audioAnalysis'

export function useKeyDetection() {
  const [loading, setLoading] = useState(false)

  const detectKey = useCallback(async (audioFile) => {
    if (!audioFile) return 'Unknown'
    setLoading(true)

    try {
      return await analyzeMusicalKey(audioFile)
    } catch {
      return 'Unknown'
    } finally {
      setLoading(false)
    }
  }, [])

  return { detectKey, loading }
}
