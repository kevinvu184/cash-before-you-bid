import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyStatus = 'idle' | 'copied' | 'failed'

export interface UseCopyLinkResult {
  copy(): Promise<void>
  status: CopyStatus
  // Set when the clipboard is unavailable, so the UI can show the link as
  // selectable text instead.
  fallbackUrl: string | null
}

const STATUS_RESET_MS = 2000

export function useCopyLink(): UseCopyLinkResult {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const copy = useCallback(async () => {
    const href = window.location.href
    try {
      await navigator.clipboard.writeText(href)
      setStatus('copied')
      setFallbackUrl(null)
    } catch {
      // Clipboard access can be missing (http, old browsers) or denied.
      setStatus('failed')
      setFallbackUrl(href)
    }
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), STATUS_RESET_MS)
  }, [])

  return { copy, status, fallbackUrl }
}
