import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { formatTime } from '../lib/sudoku'
import { useGameState } from '../hooks/useGameState'
import { useTimer } from '../hooks/useTimer'
import { useSounds } from '../hooks/useSounds'
import { buildShareText, shareResult } from '../lib/share'
import Board from '../components/Board'
import NumberPad from '../components/NumberPad'
import SettingsPanel from '../components/SettingsPanel'
import CompletionModal from '../components/CompletionModal'
import ConfirmModal from '../components/ConfirmModal'

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']
const WEEKLY_DIFFS = ['easy', 'medium', 'hard', 'expert', 'medium', 'hard', 'medium']

function getDailyDiff() {
  const start = new Date(new Date().getFullYear(), 0, 0)
  const day = Math.floor((Date.now() - start) / 86400000)
  return WEEKLY_DIFFS[day % 7]
}

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
function ActiveGame({ puzzle, difficulty, daily, settings, updateSetting, onBack, onNewGame }) {
  const game  = useGameState(puzzle, settings)
  const timer = useTimer()
  const play  = useSounds(settings.soundEffects)

  const [showSettings, setShowSettings] = useState(false)
  const [showCheat, setShowCheat]       = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const prevCompletedCount = useRef(0)

  // Start timer when game mounts
  useEffect(() => { timer.start() }, [])

  // Stop timer on completion
  useEffect(() => {
    if (game.complete) timer.pause()
  }, [game.complete])

  // Sounds — digit placement
  useEffect(() => {
    // Fires when cells change; detect correct vs wrong via mistakes counter
  }, [game.cells])

  // Sounds — group completion chime
  useEffect(() => {
    if (game.completedGroupCount > prevCompletedCount.current) {
      prevCompletedCount.current = game.completedGroupCount
      play('chime')
    }
  }, [game.completedGroupCount])

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

  // Wrap game actions with sounds
  function enterDigit(d) {
    const cell = game.cells[game.selected]
    if (!cell || cell.isGiven || game.selected === null) { game.enterDigit(d); return }
    if (game.notesMode) { game.enterDigit(d); return }
    const isCorrect = puzzle.solution[game.selected] === String(d)
    game.enterDigit(d)
    play(isCorrect ? 'tick' : 'thud')
  }

  function erase() {
    play('swoosh')
    game.erase()
  }

  function useHint() {
    play('sparkle')
    game.useHint()
  }

  async function handleShare() {
    const text = buildShareText({
      mode: daily ? 'daily' : 'practice',
      puzzle,
      cells: game.cells,
      hintedCells: game.hintedCells,
      seconds: timer.seconds,
      hintPenalty: game.hintPenalty,
      mistakes: game.mistakes,
    })
    return shareResult(text)
  }

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const now = new Date()
  const dateLabel = `${MONTHS[now.getMonth()]} ${now.getDate()}`

  const displayTime = formatTime(timer.seconds)
  const hintsUsed = 3 - game.hintsLeft

  return (
    <div className="game-screen" >
      {/* Header */}
      <div className="game-screen__header">
        <button className="back-btn" onClick={() => game.complete ? onBack() : setConfirmLeave(true)}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="game-screen__meta">
          {daily
            ? <span className="game-screen__daily-label">📅 Daily · {dateLabel}</span>
            : <span className="game-screen__difficulty">{difficulty}</span>
          }
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
        flashCells={game.flashCells}
      />

      {/* Number pad */}
      <NumberPad
        notesMode={game.notesMode}
        setNotesMode={game.setNotesMode}
        hintsLeft={game.hintsLeft}
        onDigit={enterDigit}
        onErase={erase}
        onUndo={game.undo}
        onHint={useHint}
      />

      {/* Settings overlay */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          updateSetting={updateSetting}
          onClose={() => setShowSettings(false)}
        />
      )}

      {confirmLeave && (
        <ConfirmModal
          title="Abandon this puzzle?"
          message="Your progress will be lost. You can start a fresh puzzle anytime."
          confirmLabel="Leave" cancelLabel="Keep playing"
          onConfirm={onBack} onCancel={() => setConfirmLeave(false)}
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
          onShare={handleShare}
        />
      )}
    </div>
  )
}

// ── GameScreen (orchestrates picker → active game) ────────────────
export default function GameScreen({ settings, updateSetting, onHome, daily = false }) {
  const [phase, setPhase]     = useState(daily ? 'loading' : 'pick')
  const [difficulty, setDiff] = useState(null)
  const [puzzle, setPuzzle]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Auto-fetch daily puzzle on mount
  useEffect(() => {
    if (!daily) return
    fetchDailyPuzzle()
  }, [daily])

  async function fetchDailyPuzzle() {
    setLoading(true)
    setError(null)
    try {
      const diff = getDailyDiff()
      const today = new Date().toISOString().split('T')[0]
      const seed  = parseInt(today.replace(/-/g, ''), 10)

      // Try daily-tagged puzzles first
      const { data: dailyPuzzles } = await supabase
        .from('puzzles')
        .select('id, grid, solution, difficulty')
        .eq('difficulty', diff)
        .eq('is_daily', true)

      let pool = dailyPuzzles?.length > 0 ? dailyPuzzles : null

      if (!pool) {
        const { data } = await supabase
          .from('puzzles')
          .select('id, grid, solution, difficulty')
          .eq('difficulty', diff)
          .limit(30)
        pool = data
      }

      if (!pool?.length) throw new Error(`No ${diff} puzzles found.`)

      const p = pool[seed % pool.length]
      setPuzzle(p)
      setDiff(diff)
      setPhase('playing')
    } catch (e) {
      setError(e.message)
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }

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

      const p = data[Math.floor(Math.random() * data.length)]
      setPuzzle(p)
      setDiff(diff)
      setPhase('playing')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="picker-screen">
        <p className="picker-screen__loading">Loading today's puzzle…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="picker-screen">
        <div className="picker-screen__header">
          <button className="back-btn" onClick={onHome}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h2>Daily Puzzle</h2>
        </div>
        <p className="picker-screen__error">{error}</p>
      </div>
    )
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

  return (
    <ActiveGame
      key={puzzle.id + Date.now()}
      puzzle={puzzle}
      difficulty={difficulty}
      daily={daily}
      settings={settings}
      updateSetting={updateSetting}
      onBack={onHome}
      onNewGame={daily ? fetchDailyPuzzle : () => setPhase('pick')}
    />
  )
}
