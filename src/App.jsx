import { useState } from 'react'
import { useSettings } from './hooks/useSettings'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'

const NAME_KEY = 'sudokulab_name'

function NamePrompt({ onSave }) {
  const [value, setValue] = useState('')

  function submit(e) {
    e.preventDefault()
    const name = value.trim()
    if (name) onSave(name)
  }

  return (
    <div className="modal-overlay">
      <div className="modal name-prompt">
        <h2>Welcome to Sudoku Lab!</h2>
        <p>What should we call you?</p>
        <form onSubmit={submit}>
          <input
            className="name-prompt__input"
            type="text"
            placeholder="Your name"
            value={value}
            onChange={e => setValue(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button className="btn btn--primary" type="submit" disabled={!value.trim()}>
            Let's go
          </button>
        </form>
      </div>
    </div>
  )
}

function ComingSoonModal({ label, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{label}</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: '1.5rem' }}>
          Coming in a future update — check back soon!
        </p>
        <button className="btn btn--primary" onClick={onClose}>OK</button>
      </div>
    </div>
  )
}

export default function App() {
  const { settings, updateSetting } = useSettings()

  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
  })
  const [screen, setScreen]         = useState('home')   // 'home' | 'practice'
  const [comingSoon, setComingSoon]  = useState(null)     // label string or null
  const [editingName, setEditingName] = useState(false)

  function saveName(name) {
    setPlayerName(name)
    setEditingName(false)
    try { localStorage.setItem(NAME_KEY, name) } catch {}
  }

  const showNamePrompt = !playerName || editingName

  return (
    <div className="app">
      {/* Name prompt — shown on first launch or when editing */}
      {showNamePrompt && <NamePrompt onSave={saveName} />}

      {!showNamePrompt && screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          onChangeName={() => setEditingName(true)}
          onPractice={() => setScreen('practice')}
          onCreateGame={() => setComingSoon('Create Game')}
          onJoinGame={() => setComingSoon('Join Game')}
          onDailyPuzzle={() => setComingSoon('Daily Puzzle')}
        />
      )}

      {!showNamePrompt && screen === 'practice' && (
        <GameScreen
          settings={settings}
          updateSetting={updateSetting}
          onHome={() => setScreen('home')}
        />
      )}

      {comingSoon && (
        <ComingSoonModal label={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  )
}
