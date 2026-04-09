import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { formatTime, getConflicts, getPeers, getSameDigitCells, parsePuzzle } from '../lib/sudoku'
import Board from '../components/Board'
import NumberPad from '../components/NumberPad'
import MiniGrid from '../components/MiniGrid'

// Number of hints allowed per player
const MAX_HINTS = 3
const HINT_PENALTY = 30 // seconds shown in results

export default function MultiplayerGameScreen({
  game: initialGame,
  puzzle,
  myPlayerId,
  playerName,
  settings,
  onFinish,   // (finalGame, finalPlayers) => void — navigate to results
}) {
  // ── Puzzle & local board state ──────────────────────────────────
  const solution   = puzzle.solution.split('')
  const givenCells = parsePuzzle(puzzle.grid)  // array of {digit, isGiven}

  // Local cells: array of {digit, isGiven, correct} — for display
  const [cells, setCells]       = useState(() => givenCells.map(c => ({ ...c, correct: c.isGiven })))
  const [notes, setNotes]       = useState(() => Array.from({ length: 81 }, () => new Set()))
  const [selected, setSelected] = useState(null)
  const [notesMode, setNotesMode] = useState(false)
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS)
  const [hintPenalty, setHintPenalty] = useState(0)
  const [eliminated, setEliminated]   = useState(false)
  const [myFinished, setMyFinished]   = useState(false)
  const [myFinishTime, setMyFinishTime] = useState(null)

  // ── Other players' states ──────────────────────────────────────
  const [allPlayers, setAllPlayers] = useState([])

  // ── Shared timer — computed from game.started_at ───────────────
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

  // ── Fetch all players on mount ─────────────────────────────────
  useEffect(() => {
    supabase
      .from('game_players')
      .select('*')
      .eq('game_id', initialGame.id)
      .then(({ data }) => { if (data) setAllPlayers(data) })
  }, [initialGame.id])

  // ── Realtime: other players' cell updates ──────────────────────
  useEffect(() => {
    const ch = supabase
      .channel(`mp-game-${initialGame.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_players',
        filter: `game_id=eq.${initialGame.id}`
      }, ({ new: row }) => {
        setAllPlayers(p => p.map(pl => pl.id === row.id ? row : pl))
        // If all players finished, navigate to results
        checkAllDone(row)
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [initialGame.id])

  const checkAllDone = useCallback((updatedRow) => {
    setAllPlayers(current => {
      const merged = current.map(p => p.id === updatedRow.id ? updatedRow : p)
      const realPlayers = merged.filter(p => p.role === 'player')
      if (realPlayers.length > 0 && realPlayers.every(p => p.finished_at)) {
        // Fetch final game state and navigate to results
        supabase
          .from('games')
          .select('*')
          .eq('id', initialGame.id)
          .single()
          .then(({ data: finalGame }) => {
            if (finalGame) onFinish(finalGame, merged)
          })
      }
      return merged
    })
  }, [initialGame.id, onFinish])

  // ── DB: serialize cells as 81-int array ───────────────────────
  function serializeCells(localCells) {
    return localCells.map(c => {
      if (c.isGiven) return parseInt(c.digit, 10)
      if (c.digit === 0) return 0
      return c.correct ? c.digit : -c.digit
    })
  }

  async function persistCells(localCells, extraFields = {}) {
    await supabase
      .from('game_players')
      .update({ cells: serializeCells(localCells), ...extraFields })
      .eq('id', myPlayerId)
  }

  // ── Digit entry ───────────────────────────────────────────────
  async function enterDigit(digit) {
    if (selected === null || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven) return

    if (notesMode) {
      setNotes(prev => {
        const next = prev.map(s => new Set(s))
        if (next[selected].has(digit)) {
          next[selected].delete(digit)
        } else {
          next[selected].add(digit)
        }
        return next
      })
      return
    }

    const correct = solution[selected] === String(digit)
    const newCells = cells.map((c, i) => {
      if (i !== selected) return c
      return { ...c, digit, correct }
    })

    // Auto-clear notes for this digit in peers
    const peers = getPeers(selected)
    const newNotes = notes.map((s, i) => {
      if (i === selected) return new Set()
      if (correct && peers.has(i)) {
        const next = new Set(s)
        next.delete(digit)
        return next
      }
      return s
    })

    setCells(newCells)
    setNotes(newNotes)

    const extraFields = {}
    if (!correct) {
      const newMistakeCount = (allPlayers.find(p => p.id === myPlayerId)?.mistake_count ?? 0) + 1
      extraFields.mistake_count = newMistakeCount
      setAllPlayers(p => p.map(pl =>
        pl.id === myPlayerId ? { ...pl, mistake_count: newMistakeCount } : pl
      ))
      // Check elimination
      if (initialGame.mistake_limit && newMistakeCount >= initialGame.mistake_limit) {
        setEliminated(true)
        extraFields.finished_at = new Date().toISOString()
      }
    }

    // Check completion
    const complete = newCells.every(c => c.digit > 0 && c.correct)
    if (complete) {
      const now = new Date().toISOString()
      setMyFinished(true)
      setMyFinishTime(elapsed)
      extraFields.finished_at = now
      await persistCells(newCells, extraFields)
      return
    }

    await persistCells(newCells, extraFields)
  }

  function erase() {
    if (selected === null || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven) return
    if (notesMode) {
      setNotes(prev => {
        const next = prev.map(s => new Set(s))
        next[selected] = new Set()
        return next
      })
      return
    }
    if (cell.digit === 0) return
    const newCells = cells.map((c, i) => i === selected ? { ...c, digit: 0, correct: false } : c)
    setCells(newCells)
    persistCells(newCells)
  }

  async function useHint() {
    if (selected === null || hintsLeft === 0 || myFinished || eliminated) return
    const cell = cells[selected]
    if (cell.isGiven || cell.correct) return

    const correctDigit = parseInt(solution[selected], 10)
    const newCells = cells.map((c, i) =>
      i === selected ? { ...c, digit: correctDigit, correct: true } : c
    )
    const newHintsLeft = hintsLeft - 1
    const newPenalty   = hintPenalty + HINT_PENALTY

    setCells(newCells)
    setHintsLeft(newHintsLeft)
    setHintPenalty(newPenalty)

    const complete = newCells.every(c => c.digit > 0 && c.correct)
    const extraFields = {
      hint_count: MAX_HINTS - newHintsLeft,
    }
    if (complete) {
      setMyFinished(true)
      setMyFinishTime(elapsed)
      extraFields.finished_at = new Date().toISOString()
    }
    await persistCells(newCells, extraFields)
  }

  // ── Derived display state ──────────────────────────────────────
  const conflicts  = getConflicts(cells)
  const peers      = selected !== null ? getPeers(selected) : new Set()
  const sameDigits = selected !== null ? getSameDigitCells(cells, selected) : new Set()

  // ── Keyboard handler ───────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const key = e.key
      if (key >= '1' && key <= '9') {
        e.preventDefault()
        enterDigit(parseInt(key, 10))
      } else if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault()
        erase()
      } else if (key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => s === null ? 0 : Math.max(0, s - 9))
      } else if (key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => s === null ? 0 : Math.min(80, s + 9))
      } else if (key === 'ArrowLeft') {
        e.preventDefault()
        setSelected(s => s === null ? 0 : Math.max(0, s - 1))
      } else if (key === 'ArrowRight') {
        e.preventDefault()
        setSelected(s => s === null ? 0 : Math.min(80, s + 1))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected, cells, notes, notesMode, hintsLeft, myFinished, eliminated])

  // ── Opponents ─────────────────────────────────────────────────
  const opponents = allPlayers.filter(p => p.id !== myPlayerId && p.role === 'player')

  // ── Finish overlay ─────────────────────────────────────────────
  // Show "waiting for others" if I finished but not everyone has
  const allDone = allPlayers.filter(p => p.role === 'player').every(p => p.finished_at)

  return (
    <div className="game-screen mp-game-screen">
      {/* Header */}
      <div className="game-screen__header">
        <div className="game-screen__meta" style={{ flex: 1 }}>
          <span className="game-screen__difficulty">{initialGame.difficulty}</span>
          {eliminated && <span className="mp-eliminated-badge">Eliminated</span>}
        </div>
        <div className="game-screen__timer">{formatTime(elapsed)}</div>
      </div>

      {/* Opponent mini-grids */}
      {opponents.length > 0 && (
        <div className="mp-opponents">
          {opponents.map(op => (
            <MiniGrid
              key={op.id}
              name={op.name}
              cells={op.cells}
              finished={!!op.finished_at}
            />
          ))}
        </div>
      )}

      {/* Board */}
      <Board
        cells={cells}
        notes={notes}
        selected={selected}
        setSelected={setSelected}
        conflicts={conflicts}
        peers={peers}
        sameDigits={sameDigits}
        settings={settings}
      />

      {/* Number pad */}
      <NumberPad
        notesMode={notesMode}
        setNotesMode={setNotesMode}
        hintsLeft={hintsLeft}
        onDigit={enterDigit}
        onErase={erase}
        onUndo={() => {}}   // no undo in multiplayer
        onHint={useHint}
      />

      {/* Finished overlay */}
      {myFinished && !allDone && (
        <div className="mp-waiting-overlay">
          <div className="mp-waiting-card">
            <div style={{ fontSize: '2rem' }}>🎉</div>
            <h3>Finished!</h3>
            <p style={{ color: 'var(--text-dim)' }}>{formatTime(myFinishTime + hintPenalty)}</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              Waiting for other players…
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
