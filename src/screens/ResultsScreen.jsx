import { useState } from 'react'
import { formatTime } from '../lib/sudoku'
import { buildShareText, shareResult } from '../lib/share'

const HINT_PENALTY = 30
const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

function ordinal(n) {
  return PLACE_LABELS[n - 1] || `${n}th`
}

export default function ResultsScreen({ game, players, myPlayerId, puzzle, onPlayAgain, onHome }) {
  const [shareLabel, setShareLabel] = useState('Share Result')

  const realPlayers = players
    .filter(p => p.role === 'player')
    .sort((a, b) => {
      if (a.finished_at && b.finished_at) {
        const ta = getTime(a), tb = getTime(b)
        return ta - tb
      }
      if (a.finished_at) return -1
      if (b.finished_at) return  1
      return 0
    })

  const spectators = players.filter(p => p.role === 'spectator')
  const started    = new Date(game.started_at)

  function getTime(p) {
    if (!p.finished_at) return Infinity
    const raw = Math.floor((new Date(p.finished_at) - started) / 1000)
    return raw + (p.hint_count || 0) * HINT_PENALTY
  }

  const myRank    = realPlayers.findIndex(p => p.id === myPlayerId) + 1
  const myPlayer  = realPlayers.find(p => p.id === myPlayerId)

  // "Comeback!" if winner had more mistakes than at least one other finisher
  const finishers = realPlayers.filter(p => p.finished_at)
  const winner    = finishers[0]
  const isComeback = winner && finishers.length >= 2 &&
    (winner.mistake_count || 0) > Math.min(...finishers.slice(1).map(p => p.mistake_count || 0))

  async function handleShare() {
    if (!myPlayer?.finished_at || !puzzle) return
    const seconds = Math.floor((new Date(myPlayer.finished_at) - started) / 1000)
    const text = buildShareText({
      mode: 'multiplayer',
      puzzle,
      cells: myPlayer.cells || [],
      seconds,
      hintPenalty: (myPlayer.hint_count || 0) * HINT_PENALTY,
      mistakes: myPlayer.mistake_count || 0,
      rank: myRank,
      totalPlayers: realPlayers.length,
    })
    const result = await shareResult(text)
    setShareLabel(result === 'copied' ? 'Copied!' : result === 'shared' ? 'Shared!' : 'Failed')
    setTimeout(() => setShareLabel('Share Result'), 2500)
  }

  return (
    <div className="results-screen">
      <div className="results-header">
        <h2 className="results-header__title">Results</h2>
        {myRank > 0 && (
          <p className="results-header__rank">
            You finished {ordinal(myRank)} of {realPlayers.length}
          </p>
        )}
        {isComeback && (
          <div className="results-comeback">Comeback! 🏆</div>
        )}
      </div>

      <div className="results-list">
        {realPlayers.map((p, i) => {
          const time     = getTime(p)
          const isMe     = p.id === myPlayerId
          const rank     = i + 1
          const finished = !!p.finished_at

          return (
            <div
              key={p.id}
              className={`result-row${isMe ? ' result-row--me' : ''}${rank === 1 && finished ? ' result-row--winner' : ''}`}
            >
              <span className="result-row__rank">{finished ? ordinal(rank) : '—'}</span>
              <div className="result-row__info">
                <span className="result-row__name">
                  {p.name}
                  {isMe && <span className="result-row__you"> (you)</span>}
                  {p.joined_late && <span className="result-row__tag"> joined late</span>}
                </span>
                <div className="result-row__stats">
                  {(p.mistake_count || 0) > 0 && (
                    <span className="result-stat result-stat--bad">
                      {p.mistake_count} {p.mistake_count === 1 ? 'mistake' : 'mistakes'}
                    </span>
                  )}
                  {(p.hint_count || 0) > 0 && (
                    <span className="result-stat result-stat--warn">
                      {p.hint_count} {p.hint_count === 1 ? 'hint' : 'hints'} (+{p.hint_count * HINT_PENALTY}s)
                    </span>
                  )}
                </div>
              </div>
              <div className="result-row__time">
                {finished
                  ? <span>{formatTime(time)}</span>
                  : <span style={{ color: 'var(--text-dim)' }}>DNF</span>
                }
              </div>
            </div>
          )
        })}
      </div>

      {spectators.length > 0 && (
        <p className="results-spectators">
          Spectators: {spectators.map(s => s.name).join(', ')}
        </p>
      )}

      <div className="results-actions">
        <button className="btn btn--primary" style={{ flex: 1 }} onClick={onPlayAgain}>
          Play Again
        </button>
        {myPlayer?.finished_at && puzzle && (
          <button className="btn btn--ghost" style={{ flex: 1 }} onClick={handleShare}>
            {shareLabel}
          </button>
        )}
        <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}
