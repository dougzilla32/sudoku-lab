import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { generateCode } from './lib/gameCode'
import { generateGameName } from './lib/gameName'
import { useSettings } from './hooks/useSettings'
import { useSounds } from './hooks/useSounds'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import LobbyScreen from './screens/LobbyScreen'
import MultiplayerGameScreen from './screens/MultiplayerGameScreen'
import SpectatorGameScreen from './screens/SpectatorGameScreen'
import ResultsScreen from './screens/ResultsScreen'
import JoinScreen from './screens/JoinScreen'
import RoleChoiceModal from './components/RoleChoiceModal'

const NAME_KEY     = 'sudokulab_name'
const GAME_CTX_KEY = 'sudokulab_game_ctx'

// ── Name prompt ───────────────────────────────────────────────────
function NamePrompt({ onSave, onCancel, initialValue = '' }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [])

  function submit(e) {
    e.preventDefault()
    const name = value.trim()
    if (name) onSave(name)
  }
  return (
    <div className="modal-overlay" onClick={onCancel || undefined}>
      <div className="modal name-prompt" onClick={e => e.stopPropagation()}>
        {onCancel && (
          <button className="modal-close-btn" onClick={onCancel} aria-label="Cancel">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        <h2>Welcome to Sudoku Lab!</h2>
        <p>What should we call you?</p>
        <form onSubmit={submit}>
          <input ref={inputRef} className="name-prompt__input" type="text" placeholder="Your name"
            value={value} onChange={e => setValue(e.target.value)} maxLength={20} />
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

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const { settings, updateSetting } = useSettings()
  const play = useSounds(settings.soundEffects)

  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' }
  })
  const [editingName, setEditingName] = useState(false)

  // Screen: 'home' | 'practice' | 'join' | 'lobby' | 'multiplayer' | 'spectating' | 'results'
  const [screen, setScreen] = useState('home')

  // Multiplayer context — includes myRole and optionally initialPlayerRow (rejoin)
  const [gameCtx, setGameCtx]       = useState(null)
  const [gameResult, setGameResult] = useState(null)

  // Join flow: lookup first, then role choice
  const [pendingJoin, setPendingJoin]     = useState(null)  // { game, playerCount }
  const [joinLoading, setJoinLoading]     = useState(false)
  const [joinError, setJoinError]         = useState(null)

  // Rejoin detection
  const [rejoinCtx, setRejoinCtx] = useState(null)

  const [comingSoon, setComingSoon] = useState(null)

  // ── Check for active game on startup ──────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(GAME_CTX_KEY)
    if (!saved) return
    try {
      const ctx = JSON.parse(saved)
      supabase.from('games').select('id, status, name, code').eq('id', ctx.gameId).single()
        .then(({ data }) => {
          if (data?.status === 'active') {
            setRejoinCtx({ ...ctx, gameName: data.name, gameCode: data.code })
          } else {
            localStorage.removeItem(GAME_CTX_KEY)
          }
        })
    } catch {
      localStorage.removeItem(GAME_CTX_KEY)
    }
  }, [])

  function saveName(name) {
    setPlayerName(name)
    setEditingName(false)
    try { localStorage.setItem(NAME_KEY, name) } catch {}
  }

  // ── Create Game ────────────────────────────────────────────────
  async function handleCreateGame() {
    const code = generateCode()
    const name = generateGameName()
    const { data: game, error: gameErr } = await supabase
      .from('games').insert({ code, name, difficulty: 'medium' }).select().single()
    if (gameErr) console.error('Create game error:', gameErr)
    if (!game) return
    const { data: player } = await supabase
      .from('game_players').insert({ game_id: game.id, name: playerName, role: 'player' }).select().single()
    if (!player) return
    setGameCtx({ game, puzzle: null, myPlayerId: player.id, myRole: 'player' })
    setScreen('lobby')
  }

  // ── Join: step 1 — look up game, show role choice ─────────────
  async function handleJoin(code) {
    setJoinLoading(true)
    setJoinError(null)

    const { data: games } = await supabase
      .from('games')
      .select('*, game_players(id, role)')
      .eq('code', code.toUpperCase())
      .in('status', ['lobby', 'active'])
      .limit(1)

    if (!games || games.length === 0) {
      setJoinError('Game not found. Check the code and try again.')
      setJoinLoading(false)
      return
    }

    const game        = games[0]
    const playerCount = (game.game_players || []).filter(p => p.role === 'player').length
    const specCount   = (game.game_players || []).filter(p => p.role === 'spectator').length

    if (specCount >= 20) {
      setJoinError('This game already has the maximum 20 spectators.')
      setJoinLoading(false)
      return
    }

    setJoinLoading(false)
    setPendingJoin({ game, playerCount })
  }

  // ── Join: step 2 — confirm role and insert ────────────────────
  async function handleConfirmRole(role) {
    const { game, playerCount } = pendingJoin
    setPendingJoin(null)

    if (role === 'player' && playerCount >= 8) {
      setJoinError('This game is full (8 players max).')
      return
    }

    const joinedLate = game.status === 'active'
    const { data: player } = await supabase
      .from('game_players')
      .insert({ game_id: game.id, name: playerName, role, joined_late: joinedLate && role === 'player' })
      .select().single()

    if (!player) { setJoinError('Failed to join. Please try again.'); return }

    if (game.status === 'active') {
      const { data: puzzle } = await supabase
        .from('puzzles').select('id, grid, solution').eq('id', game.puzzle_id).single()
      setGameCtx({ game, puzzle, myPlayerId: player.id, myRole: role })
      setScreen(role === 'spectator' ? 'spectating' : 'multiplayer')
    } else {
      setGameCtx({ game, puzzle: null, myPlayerId: player.id, myRole: role })
      setScreen('lobby')
    }
  }

  // ── Lobby → game starts ────────────────────────────────────────
  async function handleGameStart(updatedGame) {
    const { data: puzzle } = await supabase
      .from('puzzles').select('id, grid, solution').eq('id', updatedGame.puzzle_id).single()
    const newCtx = { ...gameCtx, game: updatedGame, puzzle }
    setGameCtx(newCtx)
    setScreen(newCtx.myRole === 'spectator' ? 'spectating' : 'multiplayer')
  }

  // ── Game / spectator finish ────────────────────────────────────
  function handleGameFinish(finalGame, finalPlayers) {
    localStorage.removeItem(GAME_CTX_KEY)
    setGameResult({ game: finalGame, players: finalPlayers })
    setScreen('results')
  }

  // ── Rejoin ─────────────────────────────────────────────────────
  async function handleRejoin() {
    const { gameId, playerId, role } = rejoinCtx
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (!game || game.status !== 'active') {
      localStorage.removeItem(GAME_CTX_KEY); setRejoinCtx(null); return
    }

    let { data: playerRow } = await supabase
      .from('game_players').select('*').eq('id', playerId).single()
    if (!playerRow) {
      // Row missing (shouldn't happen, but handle gracefully) — insert a fresh one
      const { data: newRow } = await supabase
        .from('game_players')
        .insert({ game_id: gameId, name: playerName, role, joined_late: role === 'player' })
        .select().single()
      if (!newRow) { localStorage.removeItem(GAME_CTX_KEY); setRejoinCtx(null); return }
      playerRow = newRow
    } else {
      // Restore connected flag so peers see us as back online
      await supabase.from('game_players').update({ connected: true }).eq('id', playerId)
    }

    const { data: puzzle } = await supabase
      .from('puzzles').select('id, grid, solution').eq('id', game.puzzle_id).single()

    setRejoinCtx(null)
    setGameCtx({ game, puzzle, myPlayerId: playerRow.id, myRole: role, initialPlayerRow: playerRow })
    play('welcome')
    setScreen(role === 'spectator' ? 'spectating' : 'multiplayer')
  }

  // ── Play Again ─────────────────────────────────────────────────
  async function handlePlayAgain() {
    const code = generateCode()
    const name = generateGameName()
    const { data: newGame } = await supabase
      .from('games').insert({ code, name, difficulty: gameResult.game.difficulty }).select().single()
    if (!newGame) return
    const { data: player } = await supabase
      .from('game_players').insert({ game_id: newGame.id, name: playerName, role: 'player' }).select().single()
    if (!player) return
    setGameCtx({ game: newGame, puzzle: null, myPlayerId: player.id, myRole: 'player' })
    setGameResult(null)
    setScreen('lobby')
  }

  const showNamePrompt = !playerName || editingName

  return (
    <div className="app">
      {showNamePrompt && <NamePrompt onSave={saveName} onCancel={editingName ? () => setEditingName(false) : null} initialValue={editingName ? playerName : ''} />}

      {!showNamePrompt && screen === 'home' && (
        <HomeScreen
          playerName={playerName}
          onChangeName={() => setEditingName(true)}
          onPractice={() => setScreen('practice')}
          onCreateGame={handleCreateGame}
          onJoinGame={() => { setJoinError(null); setScreen('join') }}
          onDailyPuzzle={() => setScreen('daily')}
          rejoinGame={rejoinCtx}
          onRejoin={handleRejoin}
        />
      )}

      {!showNamePrompt && screen === 'join' && (
        <JoinScreen onJoin={handleJoin} onBack={() => setScreen('home')}
          loading={joinLoading} error={joinError}
          rejoinGameId={rejoinCtx?.gameId} onRejoin={handleRejoin} />
      )}

      {!showNamePrompt && screen === 'practice' && (
        <GameScreen settings={settings} updateSetting={updateSetting} onHome={() => setScreen('home')} />
      )}

      {!showNamePrompt && screen === 'daily' && (
        <GameScreen key="daily" daily settings={settings} updateSetting={updateSetting} onHome={() => setScreen('home')} />
      )}

      {!showNamePrompt && screen === 'lobby' && gameCtx && (
        <LobbyScreen game={gameCtx.game} myPlayerId={gameCtx.myPlayerId}
          playerName={playerName} onGameStart={handleGameStart}
          onLeave={() => setScreen('home')} />
      )}

      {!showNamePrompt && screen === 'multiplayer' && gameCtx?.puzzle && (
        <MultiplayerGameScreen
          key={gameCtx.game.id + (gameCtx.initialPlayerRow ? '-rejoin' : '')}
          game={gameCtx.game} puzzle={gameCtx.puzzle}
          myPlayerId={gameCtx.myPlayerId} playerName={playerName}
          settings={settings} initialPlayerRow={gameCtx.initialPlayerRow}
          onFinish={handleGameFinish}
          onLeave={() => { setScreen('home'); setGameCtx(null) }}
        />
      )}

      {!showNamePrompt && screen === 'spectating' && gameCtx?.puzzle && (
        <SpectatorGameScreen
          key={gameCtx.game.id + '-spectator'}
          game={gameCtx.game} puzzle={gameCtx.puzzle}
          myPlayerId={gameCtx.myPlayerId} playerName={playerName}
          settings={settings}
          onFinish={handleGameFinish}
          onLeave={() => { setScreen('home'); setGameCtx(null) }}
        />
      )}

      {!showNamePrompt && screen === 'results' && gameResult && (
        <ResultsScreen
          game={gameResult.game} players={gameResult.players}
          myPlayerId={gameCtx?.myPlayerId}
          puzzle={gameCtx?.puzzle}
          onPlayAgain={handlePlayAgain}
          onHome={() => { setScreen('home'); setGameResult(null); setGameCtx(null) }}
        />
      )}

      {/* Role choice modal — shown after finding a game */}
      {pendingJoin && (
        <RoleChoiceModal
          game={pendingJoin.game}
          playerCount={pendingJoin.playerCount}
          onChoose={handleConfirmRole}
          onCancel={() => setPendingJoin(null)}
        />
      )}

      {comingSoon && (
        <ComingSoonModal label={comingSoon} onClose={() => setComingSoon(null)} />
      )}
    </div>
  )
}
