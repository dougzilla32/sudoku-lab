import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import ConfirmModal from '../components/ConfirmModal'

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']
const MISTAKE_OPTIONS = [
  { label: 'Unlimited', value: null },
  { label: '3 mistakes', value: 3 },
  { label: '5 mistakes', value: 5 },
]

export default function LobbyScreen({ game: initialGame, myPlayerId, playerName, onGameStart, onLeave }) {
  const [game, setGame]           = useState(initialGame)
  const [players, setPlayers]     = useState([])
  const [notices, setNotices]     = useState([])  // { id, text }
  const [confirmLeave, setConfirmLeave] = useState(false)
  const prevGame = useRef(initialGame)

  // ── Fetch initial player list ──────────────────────────────────
  useEffect(() => {
    supabase
      .from('game_players')
      .select('*')
      .eq('game_id', game.id)
      .then(({ data }) => { if (data) setPlayers(data) })
  }, [game.id])

  // ── Realtime: watch game row for option changes + status ───────
  useEffect(() => {
    const ch = supabase
      .channel(`lobby-game-${game.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games',
        filter: `id=eq.${game.id}`
      }, ({ new: updated }) => {
        const prev = prevGame.current
        const msgs = []
        if (updated.difficulty !== prev.difficulty) {
          msgs.push(`Difficulty changed to ${updated.difficulty}`)
        }
        if (updated.mistake_limit !== prev.mistake_limit) {
          const label = updated.mistake_limit == null
            ? 'unlimited mistakes'
            : `${updated.mistake_limit} mistake limit`
          msgs.push(`Mistake limit set to ${label}`)
        }
        if (msgs.length > 0) {
          addNotice(msgs.join(' · '))
        }
        prevGame.current = updated
        setGame(updated)

        if (updated.status === 'active') {
          onGameStart(updated)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [game.id, onGameStart])

  // ── Realtime: watch game_players ───────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`lobby-players-${game.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'game_players',
        filter: `game_id=eq.${game.id}`
      }, ({ eventType, new: row, old: oldRow }) => {
        if (eventType === 'INSERT') {
          setPlayers(p => [...p, row])
          addNotice(`${row.name} joined the lobby`)
          // Someone joined — clear the empty marker if it was set
          supabase.from('games').update({ empty_since: null }).eq('id', game.id)
        } else if (eventType === 'UPDATE') {
          setPlayers(p => p.map(pl => pl.id === row.id ? row : pl))
        } else if (eventType === 'DELETE') {
          setPlayers(p => p.filter(pl => pl.id !== oldRow.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [game.id])

  function addNotice(text) {
    const id = Date.now() + Math.random()
    setNotices(n => [...n, { id, text }])
    setTimeout(() => setNotices(n => n.filter(x => x.id !== id)), 4000)
  }

  async function toggleReady() {
    const me = players.find(p => p.id === myPlayerId)
    if (!me) return
    await supabase
      .from('game_players')
      .update({ ready: !me.ready })
      .eq('id', myPlayerId)
  }

  async function changeDifficulty(diff) {
    const me = players.find(p => p.id === myPlayerId)
    const name = me?.name || playerName
    addNotice(`${name} changed difficulty to ${diff}`)
    await supabase.from('games').update({ difficulty: diff }).eq('id', game.id)
  }

  async function changeMistakeLimit(val) {
    const me = players.find(p => p.id === myPlayerId)
    const name = me?.name || playerName
    const label = val == null ? 'unlimited' : `${val} mistakes`
    addNotice(`${name} set mistake limit to ${label}`)
    await supabase.from('games').update({ mistake_limit: val }).eq('id', game.id)
  }

  async function startGame() {
    // Pick a random puzzle for the chosen difficulty
    const { data: puzzles } = await supabase
      .from('puzzles')
      .select('id')
      .eq('difficulty', game.difficulty)
      .eq('is_daily', false)
      .limit(10)

    if (!puzzles || puzzles.length === 0) {
      addNotice('No puzzles found for this difficulty!')
      return
    }
    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)]

    await supabase
      .from('games')
      .update({
        status: 'active',
        puzzle_id: puzzle.id,
        started_at: new Date().toISOString(),
      })
      .eq('id', game.id)
    // The Realtime UPDATE handler will fire onGameStart
  }

  async function leaveGame() {
    await supabase.from('game_players').delete().eq('id', myPlayerId)

    // If this was the last real player, mark game as empty for cleanup
    const remainingPlayers = players.filter(p => p.id !== myPlayerId && p.role === 'player')
    if (remainingPlayers.length === 0) {
      await supabase
        .from('games')
        .update({ empty_since: new Date().toISOString() })
        .eq('id', game.id)
    }

    onLeave()
  }

  const myPlayer    = players.find(p => p.id === myPlayerId)
  const realPlayers = players.filter(p => p.role === 'player')
  const spectators  = players.filter(p => p.role === 'spectator')
  const playerCount = realPlayers.length
  const canStart    = playerCount >= 1

  function copyCode() {
    navigator.clipboard.writeText(game.code).catch(() => {})
  }

  return (
    <div className="lobby-screen">
      {/* Header */}
      <div className="lobby-header">
        <button className="back-btn" onClick={() => setConfirmLeave(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Leave
        </button>
        <div className="lobby-header__titles">
          <h2 className="lobby-header__title">{game.name || 'Game Lobby'}</h2>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* Game code */}
      <div className="lobby-code-card">
        <p className="lobby-code-card__label">Share this code</p>
        <div className="lobby-code-card__row">
          <span className="lobby-code-card__code">{game.code}</span>
          <button className="btn btn--ghost lobby-code-card__copy" onClick={copyCode}>
            Copy
          </button>
        </div>
      </div>

      {/* Notices */}
      {notices.length > 0 && (
        <div className="lobby-notices">
          {notices.map(n => (
            <div key={n.id} className="lobby-notice">{n.text}</div>
          ))}
        </div>
      )}

      {/* Player list */}
      <div className="lobby-section">
        <h3 className="lobby-section__title">
          Players <span className="lobby-section__count">{playerCount}</span>
        </h3>
        <div className="lobby-players">
          {realPlayers.map(p => (
            <div key={p.id} className="lobby-player">
              <span className="lobby-player__name">
                {p.name}
                {p.id === myPlayerId && <span className="lobby-player__you"> (you)</span>}
              </span>
              {p.id === myPlayerId ? (
                <button
                  className={`lobby-ready-btn${p.ready ? ' lobby-ready-btn--ready' : ''}`}
                  onClick={toggleReady}
                >
                  {p.ready ? '✓ Ready' : 'Ready?'}
                </button>
              ) : (
                <span className={`lobby-ready-badge${p.ready ? ' lobby-ready-badge--ready' : ''}`}>
                  {p.ready ? '✓ Ready' : 'Not ready'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Spectators */}
      {spectators.length > 0 && (
        <div className="lobby-section">
          <h3 className="lobby-section__title">
            Watching <span className="lobby-section__count">{spectators.length}</span>
          </h3>
          <div className="lobby-spectators">
            {spectators.map(s => (
              <span key={s.id} className="lobby-spectator-name">{s.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Game options */}
      <div className="lobby-section">
        <h3 className="lobby-section__title">Options</h3>
        <div className="lobby-options">
          <div className="lobby-option">
            <span className="lobby-option__label">Difficulty</span>
            <div className="lobby-option__pills">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`pill pill--${d}${game.difficulty === d ? ' pill--active' : ''}`}
                  onClick={() => changeDifficulty(d)}
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="lobby-option">
            <span className="lobby-option__label">Mistakes</span>
            <div className="lobby-option__pills">
              {MISTAKE_OPTIONS.map(opt => (
                <button
                  key={String(opt.value)}
                  className={`pill${game.mistake_limit === opt.value ? ' pill--active' : ''}`}
                  onClick={() => changeMistakeLimit(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Start button */}
      <button
        className="btn btn--primary lobby-start-btn"
        onClick={startGame}
        disabled={!canStart}
      >
        Start Game
      </button>

      {confirmLeave && (
        <ConfirmModal
          title="Leave the lobby?"
          message="You'll be removed from this game. You can rejoin later with the game code."
          confirmLabel="Leave"
          cancelLabel="Stay"
          onConfirm={leaveGame}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  )
}
