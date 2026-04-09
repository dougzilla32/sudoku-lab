import { useState, useEffect, useRef, useCallback } from 'react'

export function useTimer(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } else {
      clearInterval(ref.current)
    }
    return () => clearInterval(ref.current)
  }, [running])

  const start  = useCallback(() => setRunning(true), [])
  const pause  = useCallback(() => setRunning(false), [])
  const toggle = useCallback(() => setRunning(r => !r), [])
  const reset  = useCallback(() => { setSeconds(0); setRunning(false) }, [])

  return { seconds, running, start, pause, toggle, reset }
}
