import { useRef } from 'react'

const EMOJIS = ['🔥', '👏', '😱', '😂', '💀', '👀', '🏆']
const RATE_LIMIT_MS = 3000

export default function ReactionsBar({ onReact }) {
  const lastSent = useRef(0)

  function send(emoji) {
    const now = Date.now()
    if (now - lastSent.current < RATE_LIMIT_MS) return
    lastSent.current = now
    onReact(emoji)
  }

  return (
    <div className="reactions-bar">
      {EMOJIS.map(emoji => (
        <button key={emoji} className="reaction-btn" onClick={() => send(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  )
}
