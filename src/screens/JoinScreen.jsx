import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import ConfirmModal from '../components/ConfirmModal'

const DIFF_COLOR = {
  easy:   'var(--green)',
  medium: 'var(--yellow)',
  hard:   'var(--red)',
  expert: '#c084fc',
}

export default function JoinScreen({ onJoin, onBack, loading, error, rejoinGameId, onRejoin }) {
  const [lobbyGames,  setLobbyGames]  = useState([])
  const [activeGames, setActiveGames] = useState([])
  const [fetching, setFetching]       = useState(true)
  const [code, setCode]               = useState('')
  const [nukeTarget, setNukeTarget]   = useState(null)  // game to confirm-delete

  // ── Clean up stale games ───────────────────────────────────────
  async function cleanupStaleGames() {
    const fiveMin = new Date(Date.now() -  5 * 60 * 1000).toISOString()
    const oneHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const oneDay  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Step 1: Remove players who haven't sent a heartbeat in 5 min
    // (DB trigger stamps empty_since when last player is removed)
    await supabase.from('game_players').delete().lt('last_seen_at', fiveMin)

    await Promise.all([
      // Step 2: Games empty for > 5 min (trigger sets empty_since)
      supabase.from('games').delete().eq('status', 'lobby').lt('empty_since', fiveMin),
      supabase.from('games').delete().eq('status', 'active').lt('empty_since', fiveMin),
      // Finished games older than 1 hour
      supabase.from('games').delete().eq('status', 'finished').lt('created_at', oneHour),
      // Last-resort: active games older than 24 hours
      supabase.from('games').delete().eq('status', 'active').lt('created_at', oneDay),
    ])

  }

  // ── Dev: delete a specific game ────────────────────────────────
  async function nukeGame(gameId) {
    await supabase.from('games').delete().eq('id', gameId)
    setNukeTarget(null)
  }

  // ── Dev: force cleanup with 2-minute heartbeat / 1-second empty_since ───────
  async function devCleanup() {
    const twoMin = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const cutoff = new Date(Date.now() - 1000).toISOString()

    // Step 1: Remove players whose heartbeat is > 2 min old
    await supabase.from('game_players').delete().lt('last_seen_at', twoMin)

    await Promise.all([
      // Step 2: Games empty for > 1 second
      supabase.from('games').delete().eq('status', 'lobby').lt('empty_since', cutoff),
      supabase.from('games').delete().eq('status', 'active').lt('empty_since', cutoff),
      supabase.from('games').delete().eq('status', 'finished').lt('created_at', cutoff),
    ])

    fetchGames()
  }

  // ── Fetch open + active games ──────────────────────────────────
  async function fetchGames() {
    const { data: games } = await supabase
      .from('games')
      .select('id, code, name, difficulty, mistake_limit, status, created_at, game_players(id, role, finished_at)')
      .in('status', ['lobby', 'active'])
      .order('created_at', { ascending: false })
      .limit(30)

    const all = games ?? []
    setLobbyGames(all.filter(g => g.status === 'lobby'))
    setActiveGames(all.filter(g => g.status === 'active'))
    setFetching(false)
  }

  useEffect(() => {
    cleanupStaleGames().then(fetchGames)
  }, [])

  // ── Realtime: keep list fresh ──────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel('game-browser')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, fetchGames)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, fetchGames)
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

  function activePlaying(game) {
    return (game.game_players ?? []).filter(p => p.role === 'player' && !p.finished_at).length
  }

  function NukeBtn({ game }) {
    return (
      <button
        className="game-list-row__nuke"
        title="Delete game (dev)"
        onClick={e => { e.stopPropagation(); setNukeTarget(game) }}
      >
        🗑
      </button>
    )
  }

  function renderLobbyRow(g) {
    return (
      <div key={g.id} className="game-list-row-wrap">
        <button className="game-list-row" onClick={() => onJoin(g.code)} disabled={loading}>
          <div className="game-list-row__info">
            <span className="game-list-row__name">{g.name || g.code}</span>
            <span className="game-list-row__diff" style={{ color: DIFF_COLOR[g.difficulty] }}>
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
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </span>
            <span className="game-list-row__join">Join →</span>
          </div>
        </button>
        <NukeBtn game={g} />
      </div>
    )
  }

  function renderActiveRow(g) {
    const isRejoin  = g.id === rejoinGameId
    const stillLeft = activePlaying(g)
    const total     = playerCount(g)

    return (
      <div key={g.id} className="game-list-row-wrap">
        <button
          className={`game-list-row${isRejoin ? ' game-list-row--rejoin' : ''}`}
          onClick={() => isRejoin ? onRejoin() : onJoin(g.code)} disabled={loading}>
          <div className="game-list-row__info">
            <div className="game-list-row__name-row">
              <span className="game-list-row__name">{g.name || g.code}</span>
              {isRejoin
                ? <span className="game-list-badge game-list-badge--rejoin">Rejoin</span>
                : <span className="game-list-badge game-list-badge--active">In Progress</span>
              }
            </div>
            <span className="game-list-row__diff" style={{ color: DIFF_COLOR[g.difficulty] }}>
              {g.difficulty.charAt(0).toUpperCase() + g.difficulty.slice(1)}
              {g.mistake_limit ? ` · ${g.mistake_limit} mistakes` : ''}
            </span>
          </div>
          <div className="game-list-row__right">
            <span className="game-list-row__players">
              {stillLeft}/{total}
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 3 }}>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </span>
            <span className={`game-list-row__join${isRejoin ? ' game-list-row__join--rejoin' : ''}`}>
              {isRejoin ? 'Rejoin →' : 'Watch →'}
            </span>
          </div>
        </button>
        <NukeBtn game={g} />
      </div>
    )
  }

  const noGames = !fetching && lobbyGames.length === 0 && activeGames.length === 0

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

      <button className="btn btn--ghost dev-cleanup-btn" onClick={devCleanup}>
        Clean up old games
      </button>

      {fetching && <p className="join-screen__dim">Looking for games…</p>}

      {noGames && (
        <div className="join-screen__empty">
          <p>No open games right now.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Be the first — go back and create one!</p>
        </div>
      )}

      {/* Open Lobbies */}
      {lobbyGames.length > 0 && (
        <div className="join-screen__section">
          <h3 className="join-screen__section-title">Open Lobbies</h3>
          <div className="game-list">{lobbyGames.map(renderLobbyRow)}</div>
        </div>
      )}

      {/* In Progress */}
      {activeGames.length > 0 && (
        <div className="join-screen__section">
          <h3 className="join-screen__section-title">In Progress</h3>
          <div className="game-list">{activeGames.map(renderActiveRow)}</div>
        </div>
      )}

      {/* Join by code */}
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

      {nukeTarget && (
        <ConfirmModal
          title="Delete this game?"
          message={`"${nukeTarget.name || nukeTarget.code}" and all its players will be permanently removed.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          danger
          onConfirm={() => nukeGame(nukeTarget.id)}
          onCancel={() => setNukeTarget(null)}
        />
      )}
    </div>
  )
}
