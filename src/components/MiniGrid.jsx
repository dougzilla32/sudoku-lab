// Opponent mini-grid shown during multiplayer games.
// cells: array of 81 numbers (0=empty, positive=correct, negative=wrong)
export default function MiniGrid({ name, cells = [], finished, disconnected }) {
  const filled = cells.length === 81 ? cells : Array(81).fill(0)

  const nonEmpty = filled.filter(v => v !== 0).length
  const pct = Math.round((nonEmpty / 81) * 100)

  let wrapClass = 'mini-grid-wrap'
  if (finished)     wrapClass += ' mini-grid-wrap--done'
  if (disconnected) wrapClass += ' mini-grid-wrap--offline'

  return (
    <div className={wrapClass}>
      <div className="mini-grid">
        {Array.from({ length: 3 }, (_, boxRow) =>
          Array.from({ length: 3 }, (_, boxCol) => (
            <div key={boxRow * 3 + boxCol} className="mini-grid__box">
              {Array.from({ length: 3 }, (_, cellRow) =>
                Array.from({ length: 3 }, (_, cellCol) => {
                  const idx = (boxRow * 3 + cellRow) * 9 + (boxCol * 3 + cellCol)
                  const v   = filled[idx]
                  const cls = v === 0 ? '' : v > 0 ? ' mini-cell--correct' : ' mini-cell--wrong'
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
          : <span className="mini-grid__pct">{pct}%</span>
        }
      </div>
    </div>
  )
}
