import { useState, useRef, useEffect } from 'react'

const EMOJIS = ['🔥', '👏', '😱', '😂', '💀', '👀', '🏆']

export default function ChatBar({ onSend, messages = [] }) {
  const [text, setText]             = useState('')
  const [showEmojis, setShowEmojis] = useState(false)
  const [hasNew, setHasNew]         = useState(false)
  const scrollRef   = useRef(null)
  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const atBottom    = useRef(true)
  const firstRender = useRef(true)

  // Scroll behaviour on new messages
  useEffect(() => {
    if (firstRender.current) {
      bottomRef.current?.scrollIntoView()
      firstRender.current = false
      return
    }
    if (atBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      setHasNew(false)
    } else {
      setHasNew(true)
    }
  }, [messages.length])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    atBottom.current = near
    if (near && hasNew) setHasNew(false)
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    atBottom.current = true
    setHasNew(false)
  }

  function insertEmoji(emoji) {
    const input = inputRef.current
    if (!input) {
      setText(t => t + emoji)
      return
    }
    const start = input.selectionStart ?? text.length
    const end   = input.selectionEnd   ?? text.length
    const next  = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    // Restore cursor position after the inserted emoji
    requestAnimationFrame(() => {
      input.focus()
      const pos = start + emoji.length
      input.setSelectionRange(pos, pos)
    })
    setShowEmojis(false)
  }

  function sendText(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend({ text: trimmed })
    setText('')
    setShowEmojis(false)
  }

  return (
    <div className="chat-bar">
      {/* Emoji dropdown */}
      {showEmojis && (
        <div className="chat-emoji-dropdown">
          {EMOJIS.map(e => (
            <button key={e} className="chat-emoji-btn" type="button" onClick={() => insertEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input row — emoji toggle + input + send as direct grid children */}
      <button
        className={`chat-bar__emoji-toggle${showEmojis ? ' active' : ''}`}
        type="button"
        aria-label="Emoji"
        onClick={() => setShowEmojis(v => !v)}
      >
        🙂
      </button>
      <form onSubmit={sendText} className="chat-bar__form">
        <input
          ref={inputRef}
          className="chat-bar__input"
          type="text"
          placeholder="Say something…"
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={100}
        />
        <button className="chat-bar__send" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>

      {/* Scrollable message history — spans all columns */}
      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0
          ? <p className="chat-messages__empty">No messages yet</p>
          : messages.map(msg => (
            <div key={msg.id} className="chat-msg">
              <span className="chat-msg__name">{msg.name}</span>
              <span className="chat-msg__text">{msg.text ?? msg.emoji}</span>
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>

      {/* "New message" jump button — only when scrolled up */}
      {hasNew && (
        <button className="chat-new-btn" type="button" onClick={scrollToBottom}>
          ↓ new message
        </button>
      )}
    </div>
  )
}
