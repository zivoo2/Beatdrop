import { useEffect, useState } from 'react'

export function useFileDataUrl(file) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!file) {
      const resetTimer = window.setTimeout(() => {
        setDataUrl('')
      }, 0)

      return () => {
        window.clearTimeout(resetTimer)
      }
    }

    let cancelled = false
    const reader = new FileReader()

    reader.onload = () => {
      if (cancelled) return
      setDataUrl(typeof reader.result === 'string' ? reader.result : '')
    }

    reader.onerror = () => {
      if (cancelled) return
      setDataUrl('')
    }

    reader.readAsDataURL(file)

    return () => {
      cancelled = true
      reader.abort()
    }
  }, [file])

  return dataUrl
}
