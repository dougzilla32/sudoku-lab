import { formatTime } from './sudoku'

const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const ORDINALS = ['1st','2nd','3rd','4th','5th','6th','7th','8th']

function ordinal(n) { return ORDINALS[n - 1] || `${n}th` }
function dateLabel(d = new Date()) { return `${MONTHS[d.getMonth()]} ${d.getDate()}` }

// Build the 3×3 emoji grid from cell data.
// cells: object array {digit, isGiven, correct} (practice/daily) OR int array (multiplayer)
// hintedCells: Set of cell indices where a hint was used (solo only; omit for multiplayer)
function buildEmojiGrid(puzzleGrid, cells, hintedCells) {
  const rows = []
  for (let br = 0; br < 3; br++) {
    let row = ''
    for (let bc = 0; bc < 3; bc++) {
      let hasHint = false, hasWrong = false
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const idx = (br * 3 + r) * 9 + (bc * 3 + c)
          if (puzzleGrid[idx] !== '0') continue  // skip given cells
          if (hintedCells?.has(idx)) { hasHint = true; continue }
          const cell = cells[idx]
          const wrong = typeof cell === 'number'
            ? cell < 0                              // multiplayer int format
            : cell?.digit !== 0 && !cell?.correct   // solo object format
          if (wrong) hasWrong = true
        }
      }
      // Per SPEC: 🟨 wins over 🟥 wins over 🟩
      row += hasHint ? '🟨' : hasWrong ? '🟥' : '🟩'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

export function buildShareText({
  mode,        // 'daily' | 'practice' | 'multiplayer'
  puzzle,      // { grid, solution }
  cells,       // object or int array (81 items)
  hintedCells, // Set<number> (solo only)
  seconds,     // elapsed seconds (before penalty)
  hintPenalty, // seconds added for hints
  mistakes,
  rank,        // 1-based (multiplayer only)
  totalPlayers,
}) {
  const total = (seconds || 0) + (hintPenalty || 0)
  const hintsUsed = hintedCells?.size ?? 0

  const header = mode === 'daily'
    ? `Sudoku Lab – Daily Puzzle (${dateLabel()})`
    : 'Sudoku Lab – Multiplayer'

  let stats = `Solved in ${formatTime(total)} ⭐`
  stats += hintsUsed === 0 ? ' No hints' : ` ${hintsUsed} hint${hintsUsed !== 1 ? 's' : ''}`
  stats += ` · ${mistakes || 0} mistake${(mistakes || 0) !== 1 ? 's' : ''}`
  if (rank && totalPlayers > 1) stats += ` · ${ordinal(rank)} of ${totalPlayers}`

  const grid = buildEmojiGrid(puzzle.grid, cells, hintedCells)
  return `${header}\n${stats}\n\n${grid}\n\nsudoku-lab.netlify.app`
}

export async function shareResult(text) {
  try {
    if (navigator.share) {
      await navigator.share({ text })
      return 'shared'
    }
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'error'
  }
}
