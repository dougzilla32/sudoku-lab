import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

// Difficulty accent colors (match pill colors in CSS)
const DIFF_COLOR = {
  easy:   'var(--green)',
  medium: 'var(--yellow)',
  hard:   'var(--red)',
  expert: '#c084fc',
}

export default function JoinScreen({ onJoin, onBack, loading, error }) {
  const [openGames, setOpenGames] = useState([])
  const [fetching, setFetching]   = useState(true)
  const [code, setCode]           = useState('')

  // ── Clean up stale empty lobbies (empty for > 5 min) ──────────
  async function cleanupStaleGames() {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    await supabase
      .from('games')
      .delete()
      .eq('status', 'lobby')
      .lt('empty_since', cutoff)
  }

  // ── Fetch open lobbies ─────────────────────────────────────────
  async function fetchGames() {
    const { data: games } = await supabase
      .from('games')
      .select('id, code, name, difficulty, mistake_limit, created_at, game_players(id, role)')
      .eq('status', 'lobby')
      .order('created_at', { ascending: false })
      .limit(20)

    setOpenGames(games ?? [])
    setFetching(false)
  }

  useEffect(() => {
    cleanupStaleGames().then(fetchGames)
  }, [])

  // ── Realtime: keep list fresh ──────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('game-browser')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'games'
      }, () => fetchGames())
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_players'
      }, () => fetchGames())
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  function handleCodeSubmit(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length === 6) onJoin(trimmed)
  }

  function playerCount(game) {
    return (game.game_players ?? []).filter(p => p.role === 'player').length
  }

  return (
    <div className="join-screen">
      {/* Header */}
      <div className="join-screen__header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h2 className="join-screen__title">Join a Game</h2>
        <div style={{ width: 80 }} />
      </div>

      {/* Open lobbies */}
      <div className="join-screen__section">
        <h3 className="join-screen__section-title">Open Lobbies</h3>

        {fetching && (
          <p className="join-screen__dim">Looking for games…</p>
        )}

        {!fetching && openGames.length === 0 && (
          <div className="join-screen__empty">
            <p>No open games right now.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Be the first — go back and create one!
            </p>
          </div>
        )}

        {openGames.length > 0 && (
          <div className="game-list">
            {openGames.map(g => (
              <button
                key={g.id}
                className="game-list-row"
                onClick={() => onJoin(g.code)}
                disabled={loading}
              >
                <div className="game-list-row__info">
                  <span className="game-list-row__name">{g.name || g.code}</span>
                  <span
                    className="game-list-row__diff"
                    style={{ color: DIFF_COLOR[g.difficulty] }}
                  >
                    {g.difficulty.charAt(0).toUpperCase() + g.difficulty.slice(1)}
                    {g.mistake_limit ? ` · ${g.mistake_limit} mistakes` : ''}
                  </span>
                </div>
                <div className="game-list-row__right">
                  <span className="game-list-row__players">
                    {playerCount(g)}/8
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 3 }}>
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                      <path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </span>
                  <span className="game-list-row__join">Join →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Join by code (secondary, for private/active games) */}
      <div className="join-screen__by-code">
        <span className="join-screen__by-code-label">Have a code?</span>
        <form onSubmit={handleCodeSubmit} className="join-screen__by-code-form">
          <input
            className="join-screen__by-code-input"
            type="text"
            placeholder="ABCD12"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button
            className="btn btn--ghost join-screen__by-code-btn"
            type="submit"
            disabled={code.trim().length !== 6 || loading}
          >
            {loading ? '…' : 'Join'}
          </button>
        </form>
        {error && <p style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{error}</p>}
      </div>
    </div>
  )
}
