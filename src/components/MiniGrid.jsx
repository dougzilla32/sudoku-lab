// Opponent mini-grid shown during multiplayer games.
// cells: array of 81 numbers (0=empty, positive=correct/given, negative=wrong)
// puzzleGrid: 81-char string of the puzzle — non-zero chars are givens (shown grey)
export default function MiniGrid({ name, cells = [], finished, disconnected, overtaking, puzzleGrid = '' }) {
  const filled = cells.length === 81 ? cells : Array(81).fill(0)

  const givenCount = puzzleGrid.length === 81 ? puzzleGrid.split('').filter(c => c !== '0').length : 0
  const playerFilled = filled.filter((v, i) => v !== 0 && (puzzleGrid.length !== 81 || puzzleGrid[i] === '0')).length
  const cellsToFill = 81 - givenCount
  const pct = cellsToFill > 0 ? Math.round((playerFilled / cellsToFill) * 100) : 0

  let wrapClass = 'mini-grid-wrap'
  if (finished)     wrapClass += ' mini-grid-wrap--done'
  if (disconnected) wrapClass += ' mini-grid-wrap--offline'
  if (overtaking)   wrapClass += ' mini-grid-wrap--overtaking'

  return (
    <div className={wrapClass}>
      <div className="mini-grid">
        {Array.from({ length: 3 }, (_, boxRow) =>
          Array.from({ length: 3 }, (_, boxCol) => (
            <div key={boxRow * 3 + boxCol} className="mini-grid__box">
              {Array.from({ length: 3 }, (_, cellRow) =>
                Array.from({ length: 3 }, (_, cellCol) => {
                  const idx   = (boxRow * 3 + cellRow) * 9 + (boxCol * 3 + cellCol)
                  const v     = filled[idx]
                  const given = puzzleGrid.length === 81 && puzzleGrid[idx] !== '0'
                  const cls   = v === 0 ? '' : given ? ' mini-cell--given' : v > 0 ? ' mini-cell--correct' : ' mini-cell--wrong'
                  return <div key={cellRow * 3 + cellCol} className={`mini-cell${cls}`} />
                })
              )}
            </div>
          ))
        )}
      </div>
      <div className="mini-grid__label">
        <span className="mini-grid__name">{name}</span>
        {disconnected
          ? <span className="mini-grid__offline">offline</span>
          : finished
          ? <span className="mini-grid__done">Done!</span>
          : overtaking
          ? <span className="mini-grid__overtake">{pct}% ↑</span>
          : <span className="mini-grid__pct">{pct}%</span>
        }
      </div>
    </div>
  )
}
