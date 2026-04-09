import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import ConfirmModal from '../components/ConfirmModal'
import ReactionsBar from '../components/ReactionsBar'
import { formatTime, getConflicts, getPeers, getSameDigitCells, parsePuzzle } from '../lib/sudoku'
import Board from '../components/Board'
import NumberPad from '../components/NumberPad'
import MiniGrid from '../components/MiniGrid'

const MAX_HINTS    = 3
const HINT_PENALTY = 30
const EMOJI_TTL    = 2500

// ── Serialization helpers ───────────────────────────────────────
function serializeCells(cells) {
  return cells.map(c => {
    if (c.isGiven) return parseInt(c.digit, 10)
    if (c.digit === 0) return 0
    return c.correct ? c.digit : -c.digit
  })
}

function serializeNotes(notes) {
  return notes.map(s => [...s])
}

function deserializeCells(puzzleGrid, stored) {
  if (!stored || stored.length !== 81) return null
  return puzzleGrid.split('').map((ch, i) => {
    const given = parseInt(ch, 10)
    if (given > 0) return { digit: given, isGiven: true, correct: true }
    const v = stored[i] || 0
    return { digit: Math.abs(v), isGiven: false, correct: v > 0 }
  })
}

function deserializeNotes(dbNotes) {
  if (!dbNotes || dbNotes.length !== 81) return null
  return dbNotes.map(arr => new Set(arr || []))
}

export default function MultiplayerGameScreen({
  game: initialGame,
  puzzle,
  myPlayerId,
  playerName,
  settings,
  initialPlayerRow,   // set when rejoining — restores cells/notes/hints
  onFinish,
  onLeave,
}) {
  const solution   = puzzle.solution.split('')
  const givenCells = parsePuzzle(puzzle.grid)

  // ── Board state (restored from DB if rejoining) ───────────────
  const [cells, setCells] = useState(() =>
    deserializeCells(puzzle.grid, initialPlayerRow?.cells) ??
    givenCells.map(c => ({ ...c, correct: c.isGiven }))
  )
  const [notes, setNotes] = useState(() =>
    deserializeNotes(initialPlayerRow?.notes) ??
    Array.from({ length: 81 }, () => new Set())
  )
  const [selected, setSelected]   = useState(null)
  const [notesMode, setNotesMode] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(
    initialPlayerRow ? MAX_HINTS - (initialPlayerRow.hint_count || 0) : MAX_HINTS
  )
  const [hintPenalty, setHintPenalty] = useState(
    (initialPlayerRow?.hint_count || 0) * HINT_PENALTY
  )
  const [eliminated, setEliminated] = useState(() =>
    !!(initialPlayerRow?.finished_at && initialPlayerRow?.mistake_count >= (initialGame.mistake_limit || Infinity))
  )
  const [myFinished, setMyFinished]     = useState(() => !!initialPlayerRow?.finished_at)
  const [myFinishTime, setMyFinishTime] = useState(null)
  const [showCheat, setShowCheat]       = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [floatingEmojis, setFloatingEmojis] = useState([])

  // ── Other players ─────────────────────────────────────────────
  const [allPlayers, setAllPlayers] = useState([])

  // ── Shared timer ──────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(initialGame.started_at)) / 1000)
  )
  useEffect(() => {
    if (myFinished) return
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(initialGame.started_at)) / 1000))
    }, 1000)
    return () => clearInterval(iv)
  }, [initialGame.started_at, myFinished])

  // ── Save game context for reconnection ────────────────────────
  useEffect(() => {
    localStorage.setItem('sudokulab_game_ctx', JSON.stringify({
      gameId: initialGame.id, playerId: myPlayerId,
      gameCode: initialGame.code, gameName: initialGame.name, role: 'player',
    }))
    supabase.from('game_players').update({ connected: true }).eq('id', myPlayerId)
    function onVis() {
      supabase.from('game_players').update({ connected: document.visibilityState === 'visible' }).eq('id', myPlayerId)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      supabase.from('game_players').update({ connected: false }).eq('id', myPlayerId)
    }
  }, [myPlayerId])

  // ── Fetch players on mount ────────────────────────────────────
  useEffect(() => {
    supabase.from('game_players').select('*').eq('game_id', initialGame.id)
      .then(({ data }) => { if (data) setAllPlayers(data) })
  }, [initialGame.id])

  // ── Realtime: player updates ──────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`mp-game-${initialGame.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_players',
        filter: `game_id=eq.${initialGame.id}`
      }, ({ new: row }) => {
        setAllPlayers(p => p.map(pl => pl.id === row.id ? row : pl))
        checkAllDone(row)
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [initialGame.id])

  // ── Reactions channel ─────────────────────────────────────────
  const reactionsRef = useRef(null)
  useEffect(() => {
    const ch = supabase
      .channel(`reactions-${initialGame.id}`)
      .on('broadcast', { event: 'reaction' }, ({ payload }) => addEmoji(payload))
      .subscribe()
    reactionsRef.current = ch
    return () => supabase.removeChannel(ch)
  }, [initialGame.id])

  function addEmoji({ playerName: name, emoji }) {
    const id = Date.now() + Math.random()
    setFloatingEmojis(e => [...e, { id, emoji, name }])
    setTimeout(() => setFloatingEmojis(e => e.filter(x => x.id !== id)), EMOJI_TTL)
  }

  function handleReact(emoji) {
    reactionsRef.current?.send({
      type: 'broadcast', event: 'reaction',
      payload: { playerId: myPlayerId, playerName, emoji },
    })
  }

  // ── Check if all players finished ────────────────────────────
  const checkAllDone = useCallback((updatedRow) => {
    setAllPlayers(current => {
      const merged = current.map(p => p.id === updatedRow.id ? updatedRow : p)
      const realPlayers = merged.filter(p => p.role === 'player')
      if (realPlayers.length > 0 && realPlayers.every(p => p.finished_at)) {
        supabase.from('games').select('*').eq('id', initialGame.id).single()
          .then(({ data: finalGame }) => { if (finalGame) onFinish(finalGame, merged) })
      }
      return merged
    })
  }, [initialGame.id, onFinish])

  // ── Persist cells + notes to DB ───────────────────────────────
  async function persistState(localCells, localNotes, extraFields = {}) {
    await supabase.from('game_players').update({
      cells: serializeCells(localCells),
      notes: serializeNotes(localNotes),
      ...extraFields,
    }).eq('id', myPlayerId)
  }

  // ── Digit entry ───────────────────────────────────────────────
  async function enterDigit(digit) {
    if (selected === null || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven) return

    if (notesMode) {
      const newNotes = notes.map((s, i) => {
        if (i !== selected) return s
        const next = new Set(s)
        if (next.has(digit)) next.delete(digit); else next.add(digit)
        return next
      })
      setNotes(newNotes)
      persistState(cells, newNotes)
      return
    }

    const correct  = solution[selected] === String(digit)
    const newCells = cells.map((c, i) => i === selected ? { ...c, digit, correct } : c)
    const peers    = getPeers(selected)
    const newNotes = notes.map((s, i) => {
      if (i === selected) return new Set()
      if (correct && peers.has(i)) { const n = new Set(s); n.delete(digit); return n }
      return s
    })

    setCells(newCells)
    setNotes(newNotes)

    const extra = {}
    if (!correct) {
      const newCount = (allPlayers.find(p => p.id === myPlayerId)?.mistake_count ?? 0) + 1
      extra.mistake_count = newCount
      setAllPlayers(p => p.map(pl => pl.id === myPlayerId ? { ...pl, mistake_count: newCount } : pl))
      if (initialGame.mistake_limit && newCount >= initialGame.mistake_limit) {
        setEliminated(true)
        extra.finished_at = new Date().toISOString()
      }
    }

    const complete = newCells.every(c => c.digit > 0 && c.correct)
    if (complete) {
      setMyFinished(true)
      setMyFinishTime(elapsed)
      extra.finished_at = new Date().toISOString()
    }

    await persistState(newCells, newNotes, extra)
  }

  function erase() {
    if (selected === null || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven) return
    if (notesMode) {
      const newNotes = notes.map((s, i) => i === selected ? new Set() : s)
      setNotes(newNotes)
      persistState(cells, newNotes)
      return
    }
    if (cell.digit === 0) return
    const newCells = cells.map((c, i) => i === selected ? { ...c, digit: 0, correct: false } : c)
    setCells(newCells)
    persistState(newCells, notes)
  }

  async function useHint() {
    if (selected === null || hintsLeft === 0 || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven || cell.correct) return

    const correctDigit = parseInt(solution[selected], 10)
    const newCells     = cells.map((c, i) => i === selected ? { ...c, digit: correctDigit, correct: true } : c)
    const newHintsLeft = hintsLeft - 1
    const newPenalty   = hintPenalty + HINT_PENALTY

    setCells(newCells)
    setHintsLeft(newHintsLeft)
    setHintPenalty(newPenalty)

    const extra = { hint_count: MAX_HINTS - newHintsLeft }
    const complete = newCells.every(c => c.digit > 0 && c.correct)
    if (complete) {
      setMyFinished(true)
      setMyFinishTime(elapsed)
      extra.finished_at = new Date().toISOString()
    }
    await persistState(newCells, notes, extra)
  }

  async function leaveGame() {
    localStorage.removeItem('sudokulab_game_ctx')
    await supabase.from('game_players').delete().eq('id', myPlayerId)
    onLeave()
  }

  async function cheatFill() {
    if (myFinished || eliminated) return
    const newCells = cells.map((c, i) => c.isGiven ? c : { ...c, digit: parseInt(solution[i], 10), correct: true })
    const newNotes = Array.from({ length: 81 }, () => new Set())
    setCells(newCells)
    setNotes(newNotes)
    setMyFinished(true)
    setMyFinishTime(elapsed)
    setShowCheat(false)
    await persistState(newCells, newNotes, { finished_at: new Date().toISOString() })
  }

  // ── Derived display ───────────────────────────────────────────
  const conflicts  = getConflicts(cells)
  const peers      = selected !== null ? getPeers(selected) : new Set()
  const sameDigits = selected !== null ? getSameDigitCells(cells, selected) : new Set()

  // ── Keyboard handler ──────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const k = e.key
      if (k >= '1' && k <= '9')                  { e.preventDefault(); enterDigit(parseInt(k, 10)) }
      else if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); erase() }
      else if (k === 'ArrowUp')    { e.preventDefault(); setSelected(s => s === null ? 0 : Math.max(0, s - 9)) }
      else if (k === 'ArrowDown')  { e.preventDefault(); setSelected(s => s === null ? 0 : Math.min(80, s + 9)) }
      else if (k === 'ArrowLeft')  { e.preventDefault(); setSelected(s => s === null ? 0 : Math.max(0, s - 1)) }
      else if (k === 'ArrowRight') { e.preventDefault(); setSelected(s => s === null ? 0 : Math.min(80, s + 1)) }
      else if (k === 's' || k === 'S') { setShowCheat(v => !v) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected, cells, notes, notesMode, hintsLeft, myFinished, eliminated])

  const opponents = allPlayers.filter(p => p.id !== myPlayerId && p.role === 'player')
  const allDone   = allPlayers.filter(p => p.role === 'player').every(p => p.finished_at)

  return (
    <div className="game-screen mp-game-screen">
      {/* Header */}
      <div className="game-screen__header">
        <button className="back-btn" onClick={() => setConfirmLeave(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="game-screen__meta">
          <span className="game-screen__difficulty">{initialGame.difficulty}</span>
          {eliminated && <span className="mp-eliminated-badge">Eliminated</span>}
          {showCheat && !myFinished && <button className="cheat-btn" onClick={cheatFill}>⚡ Fill</button>}
        </div>
        <div className="game-screen__timer">{formatTime(elapsed)}</div>
      </div>

      {/* Opponent mini-grids */}
      {opponents.length > 0 && (
        <div className="mp-opponents">
          {opponents.map(op => (
            <MiniGrid key={op.id} name={op.name} cells={op.cells}
              finished={!!op.finished_at} disconnected={!op.connected} />
          ))}
        </div>
      )}

      {/* Board */}
      <Board cells={cells} notes={notes} selected={selected} setSelected={setSelected}
        conflicts={conflicts} peers={peers} sameDigits={sameDigits} settings={settings} />

      {/* Number pad */}
      <NumberPad notesMode={notesMode} setNotesMode={setNotesMode} hintsLeft={hintsLeft}
        onDigit={enterDigit} onErase={erase} onUndo={() => {}} onHint={useHint} />

      {/* Reactions */}
      <ReactionsBar onReact={handleReact} />

      {/* Floating emoji reactions */}
      {floatingEmojis.length > 0 && (
        <div className="floating-emojis">
          {floatingEmojis.map(fe => (
            <div key={fe.id} className="floating-emoji">
              <span className="floating-emoji__emoji">{fe.emoji}</span>
              <span className="floating-emoji__name">{fe.name}</span>
            </div>
          ))}
        </div>
      )}

      {confirmLeave && (
        <ConfirmModal title="Abandon the game?"
          message="You'll be removed from the race and your progress will be lost. Other players will keep playing."
          confirmLabel="Leave" cancelLabel="Keep playing"
          onConfirm={leaveGame} onCancel={() => setConfirmLeave(false)} />
      )}

      {/* Finished / waiting overlay */}
      {myFinished && !allDone && (
        <div className="mp-waiting-overlay">
          <div className="mp-waiting-card">
            <div style={{ fontSize: '2rem' }}>🎉</div>
            <h3>Finished!</h3>
            <p style={{ color: 'var(--text-dim)' }}>{formatTime((myFinishTime ?? elapsed) + hintPenalty)}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Waiting for other players…</p>
          </div>
        </div>
      )}
    </div>
  )
}
