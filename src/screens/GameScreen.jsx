import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { formatTime } from '../lib/sudoku'
import { useGameState } from '../hooks/useGameState'
import { useTimer } from '../hooks/useTimer'
import Board from '../components/Board'
import NumberPad from '../components/NumberPad'
import SettingsPanel from '../components/SettingsPanel'
import CompletionModal from '../components/CompletionModal'

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

// ── Difficulty Picker ────────────────────────────────────────────
function DifficultyPicker({ onPick, onBack, loading, error }) {
  return (
    <div className="picker-screen">
      <div className="picker-screen__header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h2>Choose Difficulty</h2>
      </div>

      {error && <p className="picker-screen__error">{error}</p>}

      <div className="picker-screen__options">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            className={`diff-btn diff-btn--${d}`}
            onClick={() => onPick(d)}
            disabled={loading}
          >
            <span className="diff-btn__label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
            <span className="diff-btn__desc">{diffDesc(d)}</span>
          </button>
        ))}
      </div>

      {loading && <p className="picker-screen__loading">Loading puzzle…</p>}
    </div>
  )
}

function diffDesc(d) {
  return { easy: 'Gentle warm-up', medium: 'Balanced challenge', hard: 'Serious test', expert: 'No mercy' }[d]
}

// ── Active Game ──────────────────────────────────────────────────
function ActiveGame({ puzzle, difficulty, settings, updateSetting, onBack, onNewGame }) {
  const game = useGameState(puzzle, settings)
  const timer = useTimer()
  const [showSettings, setShowSettings] = useState(false)
  const [showCheat, setShowCheat] = useState(false)
  const boardRef = useRef(null)

  // Start timer when game mounts
  useEffect(() => { timer.start() }, [])

  // Stop timer on completion
  useEffect(() => {
    if (game.complete) timer.pause()
  }, [game.complete])

  // Keyboard handler
  useEffect(() => {
    function onKey(e) {
      if (showSettings) return
      const key = e.key

      if (key >= '1' && key <= '9') {
        e.preventDefault()
        game.enterDigit(parseInt(key, 10))
      } else if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault()
        game.erase()
      } else if (key === 'ArrowUp') {
        e.preventDefault()
        game.setSelected(s => s === null ? 0 : Math.max(0, s - 9))
      } else if (key === 'ArrowDown') {
        e.preventDefault()
        game.setSelected(s => s === null ? 0 : Math.min(80, s + 9))
      } else if (key === 'ArrowLeft') {
        e.preventDefault()
        game.setSelected(s => s === null ? 0 : Math.max(0, s - 1))
      } else if (key === 'ArrowRight') {
        e.preventDefault()
        game.setSelected(s => s === null ? 0 : Math.min(80, s + 1))
      } else if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault()
        game.undo()
      } else if (key === 's' || key === 'S') {
        setShowCheat(v => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSettings, game])

  const displayTime = formatTime(timer.seconds)
  const hintsUsed = 3 - game.hintsLeft

  return (
    <div className="game-screen" ref={boardRef}>
      {/* Header */}
      <div className="game-screen__header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="game-screen__meta">
          <span className="game-screen__difficulty">{difficulty}</span>
          {showCheat && (
            <button className="cheat-btn" onClick={() => { game.fillAll(); setShowCheat(false) }}>
              ⚡ Fill
            </button>
          )}
        </div>
        <div className="game-screen__timer">{displayTime}</div>
        <button className="icon-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Board */}
      <Board
        cells={game.cells}
        notes={game.notes}
        selected={game.selected}
        setSelected={game.setSelected}
        conflicts={game.conflicts}
        peers={game.peers}
        sameDigits={game.sameDigits}
        settings={settings}
      />

      {/* Number pad */}
      <NumberPad
        notesMode={game.notesMode}
        setNotesMode={game.setNotesMode}
        hintsLeft={game.hintsLeft}
        onDigit={game.enterDigit}
        onErase={game.erase}
        onUndo={game.undo}
        onHint={game.useHint}
      />

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Completion modal */}
      {game.complete && (
        <CompletionModal
          seconds={timer.seconds}
          hintPenalty={game.hintPenalty}
          mistakes={game.mistakes}
          hintsUsed={hintsUsed}
          onPlayAgain={onNewGame}
          onHome={onBack}
        />
      )}
    </div>
  )
}

// ── GameScreen (orchestrates picker → active game) ────────────────
export default function GameScreen({ settings, updateSetting, onHome }) {
  const [phase, setPhase]       = useState('pick')   // 'pick' | 'playing'
  const [difficulty, setDiff]   = useState(null)
  const [puzzle, setPuzzle]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function pickDifficulty(diff) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('puzzles')
        .select('id, grid, solution, difficulty')
        .eq('difficulty', diff)
        .eq('is_daily', false)
        .limit(10)

      if (err) throw err
      if (!data || data.length === 0) throw new Error(`No ${diff} puzzles found. Run the schema SQL in Supabase first.`)

      const puzzle = data[Math.floor(Math.random() * data.length)]
      setPuzzle(puzzle)
      setDiff(diff)
      setPhase('playing')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'pick') {
    return (
      <DifficultyPicker
        onPick={pickDifficulty}
        onBack={onHome}
        loading={loading}
        error={error}
      />
    )
  }

  // Key forces a full remount (fresh game state) when playing again
  return (
    <ActiveGame
      key={puzzle.id + Date.now()}
      puzzle={puzzle}
      difficulty={difficulty}
      settings={settings}
      updateSetting={updateSetting}
      onBack={onHome}
      onNewGame={() => setPhase('pick')}
    />
  )
}
