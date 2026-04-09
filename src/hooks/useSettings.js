import { useState } from 'react'

const DEFAULTS = {
  highlightDuplicates: true,
  highlightSelection: true,
  autoClearNotes: true,
  soundEffects: true,
}

const KEY = 'sudokulab_settings'

export function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  function updateSetting(key, value) {
    const next = { ...settings, [key]: value }
    setSettings(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  return { settings, updateSetting }
}
