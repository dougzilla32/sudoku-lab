import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { formatTime, getConflicts } from '../lib/sudoku'
import Board from '../components/Board'
import MiniGrid from '../components/MiniGrid'
import ChatBar from '../components/ChatBar'
import ConfirmModal from '../components/ConfirmModal'


// Build Board-compatible cells from puzzle grid + stored 81-int array
function deriveCells(puzzleGrid, storedCells) {
  const arr = storedCells?.length === 81 ? storedCells : Array(81).fill(0)
  return puzzleGrid.split('').map((ch, i) => {
    const given = parseInt(ch, 10)
    if (given > 0) return { digit: given, isGiven: true }
    const v = arr[i] || 0
    return { digit: Math.abs(v), isGiven: false }
  })
}

// Set of wrong-cell indices (stored as negative values)
function wrongSet(storedCells) {
  const arr = storedCells?.length === 81 ? storedCells : []
  return new Set(arr.reduce((acc, v, i) => { if (v < 0) acc.push(i); return acc }, []))
}

export default function SpectatorGameScreen({
  game: initialGame,
  puzzle,
  myPlayerId,
  playerName,
  onFinish,
  onLeave,
}) {
  const [players, setPlayers]         = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const reactionsRef = useRef(null)

  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(initialGame.started_at)) / 1000)
  )
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(initialGame.started_at)) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [initialGame.started_at])

  // ── Save game context for reconnection ────────────────────────
  useEffect(() => {
    localStorage.setItem('sudokulab_game_ctx', JSON.stringify({
      gameId: initialGame.id, playerId: myPlayerId,
      gameCode: initialGame.code, gameName: initialGame.name, role: 'spectator',
    }))
    return () => {
      supabase.from('game_players').update({ connected: false }).eq('id', myPlayerId)
    }
  }, [])

  // ── Delete player row on page unload (refresh / tab close) ────
  useEffect(() => {
    function onUnload() {
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/game_players?id=eq.${myPlayerId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          keepalive: true,
        }
      )
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [myPlayerId])

  // ── Heartbeat: update last_seen_at every 60 seconds ──────────
  useEffect(() => {
    const iv = setInterval(() => {
      supabase.from('game_players').update({ last_seen_at: new Date().toISOString() }).eq('id', myPlayerId)
    }, 60_000)
    return () => clearInterval(iv)
  }, [myPlayerId])

  // ── Connected tracking ────────────────────────────────────────
  useEffect(() => {
    supabase.from('game_players').update({ connected: true }).eq('id', myPlayerId)
    function onVis() {
      supabase.from('game_players').update({ connected: document.visibilityState === 'visible' }).eq('id', myPlayerId)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [myPlayerId])

  // ── Fetch initial players ─────────────────────────────────────
  useEffect(() => {
    supabase.from('game_players').select('*').eq('game_id', initialGame.id)
      .then(({ data }) => {
        if (!data) return
        setPlayers(data)
        const first = data.find(p => p.role === 'player')
        if (first) setSelectedPlayer(first.id)
      })
  }, [initialGame.id])

  // ── Realtime: player updates + game finish detection ──────────
  useEffect(() => {
    const ch = supabase
      .channel(`spectator-game-${initialGame.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_players',
        filter: `game_id=eq.${initialGame.id}`
      }, ({ new: row }) => {
        setPlayers(prev => {
          const merged = prev.map(p => p.id === row.id ? row : p)
          const realPlayers = merged.filter(p => p.role === 'player')
          if (realPlayers.length > 0 && realPlayers.every(p => p.finished_at)) {
            supabase.from('games')
              .update({ status: 'finished' })
              .eq('id', initialGame.id)
              .select('*').single()
              .then(({ data: finalGame }) => { if (finalGame) onFinish(finalGame, merged) })
          }
          return merged
        })
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [initialGame.id, onFinish])

  // ── Chat channel ──────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`reactions-${initialGame.id}`)
      .on('broadcast', { event: 'reaction' }, ({ payload }) => addMessage(payload))
      .subscribe()
    reactionsRef.current = ch
    return () => supabase.removeChannel(ch)
  }, [initialGame.id])

  function addMessage({ playerName: name, text, emoji }) {
    const id = Date.now() + Math.random()
    setChatMessages(m => [...m.slice(-199), { id, name, text, emoji }])
  }

  function handleSend({ text, emoji }) {
    const payload = { playerId: myPlayerId, playerName, text, emoji }
    addMessage(payload)
    reactionsRef.current?.send({ type: 'broadcast', event: 'reaction', payload })
  }

  async function leaveGame() {
    localStorage.removeItem('sudokulab_game_ctx')
    await supabase.from('game_players').delete().eq('id', myPlayerId)
    onLeave()
  }

  const realPlayers  = players.filter(p => p.role === 'player')
  const viewing      = players.find(p => p.id === selectedPlayer)
  const emptyNotes   = Array.from({ length: 81 }, () => new Set())
  const derivedCells = viewing ? deriveCells(puzzle.grid, viewing.cells) : Array(81).fill({ digit: 0, isGiven: false })
  const wrongCells   = viewing ? wrongSet(viewing.cells) : new Set()

  return (
    <div className="game-screen mp-game-screen spectator-screen">
      {/* Header */}
      <div className="game-screen__header">
        <button className="back-btn" onClick={() => setConfirmLeave(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="game-screen__meta">
          <span className="game-screen__difficulty">{initialGame.difficulty}</span>
          <span className="spectator-badge">watching</span>
        </div>
        <div className="game-screen__timer">{formatTime(elapsed)}</div>
      </div>

      {/* Player selector strip */}
      {realPlayers.length > 0 && (
        <div className="spectator-player-strip">
          {realPlayers.map(p => (
            <button
              key={p.id}
              className={`spectator-player-tab${p.id === selectedPlayer ? ' spectator-player-tab--active' : ''}`}
              onClick={() => setSelectedPlayer(p.id)}
            >
              <span className="spectator-player-tab__name">{p.name}</span>
              <span className={`spectator-player-tab__status${p.finished_at ? ' done' : ''}`}>
                {p.finished_at ? 'Done' : `${Math.round(((p.cells?.length === 81 ? p.cells.filter(v => v !== 0).length : 0) / 81) * 100)}%`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Full board of selected player */}
      <Board
        cells={derivedCells}
        notes={emptyNotes}
        selected={null}
        setSelected={() => {}}
        conflicts={wrongCells}
        peers={new Set()}
        sameDigits={new Set()}
        settings={{ highlightDuplicates: true, highlightSelection: false }}
      />

      {/* Mini-grid overview */}
      {realPlayers.length > 1 && (
        <div className="mp-opponents">
          {realPlayers.filter(p => p.id !== selectedPlayer).map(op => (
            <MiniGrid
              key={op.id}
              name={op.name}
              cells={op.cells}
              finished={!!op.finished_at}
              disconnected={!op.connected}
              puzzleGrid={puzzle.grid}
            />
          ))}
        </div>
      )}

      {/* Chat */}
      <ChatBar onSend={handleSend} messages={chatMessages} />

      {confirmLeave && (
        <ConfirmModal
          title="Stop watching?"
          message="You'll leave the spectator view and return to the home screen."
          confirmLabel="Leave"
          cancelLabel="Keep watching"
          onConfirm={leaveGame}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
    </div>
  )
}
