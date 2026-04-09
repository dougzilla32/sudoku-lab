import { useCallback } from 'react'
import * as Sounds from '../lib/sounds'

export function useSounds(enabled) {
  return useCallback((name, ...args) => {
    if (!enabled) return
    try { Sounds[name]?.(...args) } catch {}
  }, [enabled])
}
