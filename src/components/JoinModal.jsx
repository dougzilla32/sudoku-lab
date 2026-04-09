import { useState } from 'react'

export default function JoinModal({ onJoin, onClose, loading, error }) {
  const [code, setCode] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 6) onJoin(trimmed)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal join-modal" onClick={e => e.stopPropagation()}>
        <h2>Join a Game</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Enter the 6-character game code
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="code-input"
            type="text"
            placeholder="ABCD12"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
          />
          {error && <p style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</p>}
          <button
            className="btn btn--primary"
            type="submit"
            disabled={code.trim().length !== 6 || loading}
          >
            {loading ? 'Joining…' : 'Join Game'}
          </button>
        </form>

        <button
          className="btn btn--ghost"
          style={{ width: '100%' }}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
