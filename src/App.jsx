import { useState } from 'react'
import { supabase } from './supabaseClient'
import { generateCode } from './lib/gameCode'
import { generateGameName } from './lib/gameName'
import { useSettings } from './hooks/useSettings'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import LobbyScreen from './screens/LobbyScreen'
import MultiplayerGameScreen from './screens/MultiplayerGameScreen'
import ResultsScreen from './screens/ResultsScreen'
import JoinScreen from './screens/JoinScreen'

const NAME_KEY = 'sudokulab_name'

// ── Name prompt ───────────────────────────────────────────────────
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

// ── Coming-soon stub modal ────────────────────────────────────────
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

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const { settings, updateSetting } = useSettings()

  const [playerName, setPlayerName]   = useState(() => {
    try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
  })
  const [editingName, setEditingName] = useState(false)

  // Screen: 'home' | 'practice' | 'join' | 'lobby' | 'multiplayer' | 'results'
  const [screen, setScreen] = useState('home')

  // Multiplayer context
  const [gameCtx, setGameCtx]     = useState(null)  // { game, puzzle, myPlayerId }
  const [gameResult, setGameResult] = useState(null) // { game, players }

  // UI state
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError]     = useState(null)
  const [comingSoon, setComingSoon]   = useState(null)

  function saveName(name) {
    setPlayerName(name)
    setEditingName(false)
    try { localStorage.setItem(NAME_KEY, name) } catch {}
  }

  // ── Create Game ────────────────────────────────────────────────
  async function handleCreateGame() {
    const code = generateCode()
    const name = generateGameName()
    const { data: game, error } = await supabase
      .from('games')
      .insert({ code, name, difficulty: 'medium' })
      .select()
      .single()

    if (error || !game) return

    const { data: player } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, name: playerName, role: 'player' })
      .select()
      .single()

    if (!player) return

    setGameCtx({ game, puzzle: null, myPlayerId: player.id })
    setScreen('lobby')
  }

  // ── Join Game ──────────────────────────────────────────────────
  async function handleJoin(code) {
    setJoinLoading(true)
    setJoinError(null)

    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .in('status', ['lobby', 'active'])
      .limit(1)

    if (!games || games.length === 0) {
      setJoinError('Game not found. Check the code and try again.')
      setJoinLoading(false)
      return
    }

    const game = games[0]

    // Check player limit (8 players max)
    const { count } = await supabase
      .from('game_players')
      .select('id', { count: 'exact', head: true })
      .eq('game_id', game.id)
      .eq('role', 'player')

    if (count >= 8) {
      setJoinError('This game is full (8 players max).')
      setJoinLoading(false)
      return
    }

    const joinedLate = game.status === 'active'
    const { data: player } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, name: playerName, role: 'player', joined_late: joinedLate })
      .select()
      .single()

    if (!player) {
      setJoinError('Failed to join. Please try again.')
      setJoinLoading(false)
      return
    }

    setJoinLoading(false)

    if (joinedLate) {
      // Fetch puzzle and go straight to the game
      const { data: puzzle } = await supabase
        .from('puzzles')
        .select('id, grid, solution')
        .eq('id', game.puzzle_id)
        .single()
      setGameCtx({ game, puzzle, myPlayerId: player.id })
      setScreen('multiplayer')
    } else {
      setGameCtx({ game, puzzle: null, myPlayerId: player.id })
      setScreen('lobby')
    }
  }

  // ── Lobby: game starts ─────────────────────────────────────────
  async function handleGameStart(updatedGame) {
    // Fetch puzzle data
    const { data: puzzle } = await supabase
      .from('puzzles')
      .select('id, grid, solution')
      .eq('id', updatedGame.puzzle_id)
      .single()

    setGameCtx(ctx => ({ ...ctx, game: updatedGame, puzzle }))
    setScreen('multiplayer')
  }

  // ── Multiplayer: game finishes ─────────────────────────────────
  function handleGameFinish(finalGame, finalPlayers) {
    setGameResult({ game: finalGame, players: finalPlayers })
    setScreen('results')
  }

  // ── Play Again: new lobby with same group ──────────────────────
  async function handlePlayAgain() {
    const code = generateCode()
    const name = generateGameName()
    const { data: newGame } = await supabase
      .from('games')
      .insert({ code, name, difficulty: gameResult.game.difficulty })
      .select()
      .single()

    if (!newGame) return

    const { data: player } = await supabase
      .from('game_players')
      .insert({ game_id: newGame.id, name: playerName, role: 'player' })
      .select()
      .single()

    if (!player) return

    setGameCtx({ game: newGame, puzzle: null, myPlayerId: player.id })
    setGameResult(null)
    setScreen('lobby')
  }

  const showNamePrompt = !playerName || editingName

  return (
    <div className="app">
      {showNamePrompt && <NamePrompt onSave={saveName} />}

      {!showNamePrompt && screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          onChangeName={() => setEditingName(true)}
          onPractice={() => setScreen('practice')}
          onCreateGame={handleCreateGame}
          onJoinGame={() => { setJoinError(null); setScreen('join') }}
          onDailyPuzzle={() => setComingSoon('Daily Puzzle')}
        />
      )}

      {!showNamePrompt && screen === 'join' && (
        <JoinScreen
          onJoin={handleJoin}
          onBack={() => setScreen('home')}
          loading={joinLoading}
          error={joinError}
        />
      )}

      {!showNamePrompt && screen === 'practice' && (
        <GameScreen
          settings={settings}
          updateSetting={updateSetting}
          onHome={() => setScreen('home')}
        />
      )}

      {!showNamePrompt && screen === 'lobby' && gameCtx && (
        <LobbyScreen
          game={gameCtx.game}
          myPlayerId={gameCtx.myPlayerId}
          playerName={playerName}
          onGameStart={handleGameStart}
          onLeave={() => setScreen('home')}
        />
      )}

      {!showNamePrompt && screen === 'multiplayer' && gameCtx?.puzzle && (
        <MultiplayerGameScreen
          key={gameCtx.game.id}
          game={gameCtx.game}
          puzzle={gameCtx.puzzle}
          myPlayerId={gameCtx.myPlayerId}
          playerName={playerName}
          settings={settings}
          onFinish={handleGameFinish}
        />
      )}

      {!showNamePrompt && screen === 'results' && gameResult && (
        <ResultsScreen
          game={gameResult.game}
          players={gameResult.players}
          myPlayerId={gameCtx?.myPlayerId}
          onPlayAgain={handlePlayAgain}
          onHome={() => { setScreen('home'); setGameResult(null); setGameCtx(null) }}
        />
      )}

      {comingSoon && (
        <ComingSoonModal label={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  )
}
