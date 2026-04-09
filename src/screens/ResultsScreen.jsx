import { formatTime } from '../lib/sudoku'

const HINT_PENALTY = 30

const PLACE_LABELS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

function ordinal(n) {
  return PLACE_LABELS[n - 1] || `${n}th`
}

export default function ResultsScreen({ game, players, myPlayerId, onPlayAgain, onHome }) {
  // Sort players: finished players by time, then unfinished
  const realPlayers = players
    .filter(p => p.role === 'player')
    .sort((a, b) => {
      if (a.finished_at && b.finished_at) {
        return new Date(a.finished_at) - new Date(b.finished_at)
      }
      if (a.finished_at) return -1
      if (b.finished_at) return  1
      return 0
    })

  const spectators = players.filter(p => p.role === 'spectator')
  const started    = new Date(game.started_at)

  function getTime(p) {
    if (!p.finished_at) return null
    const raw = Math.floor((new Date(p.finished_at) - started) / 1000)
    return raw + (p.hint_count * HINT_PENALTY)
  }

  const myRank = realPlayers.findIndex(p => p.id === myPlayerId) + 1

  return (
    <div className="results-screen">
      <div className="results-header">
        <h2 className="results-header__title">Results</h2>
        {myRank > 0 && (
          <p className="results-header__rank">
            You finished {ordinal(myRank)} of {realPlayers.length}
          </p>
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
                  {p.mistake_count > 0 && (
                    <span className="result-stat result-stat--bad">
                      {p.mistake_count} {p.mistake_count === 1 ? 'mistake' : 'mistakes'}
                    </span>
                  )}
                  {p.hint_count > 0 && (
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
        <button className="btn btn--ghost" style={{ flex: 1 }} onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}
