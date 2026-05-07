import { useCallback, useState } from 'react'
import { analyzeTempo } from '../utils/audioAnalysis'

export function useBPMDetection() {
  const [loading, setLoading] = useState(false)

  const detectBPM = useCallback(async (audioFile) => {
    if (!audioFile) return ''
    setLoading(true)

    try {
      return await analyzeTempo(audioFile)
    } catch {
      return ''
    } finally {
      setLoading(false)
    }
  }, [])

  return { detectBPM, loading }
}
