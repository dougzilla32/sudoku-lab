import { getRow, getCol, getBox } from '../lib/sudoku'

// Renders the 9×9 board as a 3×3 grid of 3×3 boxes.
// Cell index 0–80, reading left-to-right, top-to-bottom.
export default function Board({ cells, notes, selected, setSelected, conflicts, peers, sameDigits, settings, flashCells }) {
  const selectedDigit = selected !== null ? cells[selected].digit : 0

  return (
    <div className="board" onContextMenu={e => e.preventDefault()}>
      {Array.from({ length: 9 }, (_, boxIdx) => (
        <div key={boxIdx} className="sudoku-box">
          {Array.from({ length: 9 }, (_, pos) => {
            const boxRow = Math.floor(boxIdx / 3)
            const boxCol = boxIdx % 3
            const cellRow = boxRow * 3 + Math.floor(pos / 3)
            const cellCol = boxCol * 3 + (pos % 3)
            const idx = cellRow * 9 + cellCol

            const cell      = cells[idx]
            const noteSet   = notes[idx]
            const isSelected   = idx === selected
            const isConflict   = settings.highlightDuplicates && conflicts.has(idx)
            const isPeer       = settings.highlightSelection && !isSelected && peers.has(idx)
            const isSameDigit  = settings.highlightSelection && !isSelected && sameDigits.has(idx)

            const isFlash = flashCells?.has(idx)
            const cls = [
              'cell',
              cell.isGiven ? 'cell--given' : 'cell--player',
              isSelected   ? 'cell--selected'   : '',
              isPeer       ? 'cell--peer'        : '',
              isSameDigit  ? 'cell--same-digit'  : '',
              isConflict   ? 'cell--conflict'    : '',
              isFlash      ? 'cell--flash'       : '',
            ].filter(Boolean).join(' ')

            return (
              <div key={idx} className={cls} onClick={() => setSelected(idx)}>
                {cell.digit !== 0 ? (
                  <span className="cell__digit">{cell.digit}</span>
                ) : noteSet.size > 0 ? (
                  <div className="cell__notes">
                    {[1,2,3,4,5,6,7,8,9].map(n => (
                      <span key={n} className="cell__note">
                        {noteSet.has(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
