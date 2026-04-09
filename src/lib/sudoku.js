// Pure Sudoku utility functions — no React dependencies

export function getRow(idx) {
  return Math.floor(idx / 9)
}

export function getCol(idx) {
  return idx % 9
}

export function getBox(idx) {
  return Math.floor(getRow(idx) / 3) * 3 + Math.floor(getCol(idx) / 3)
}

// All cell indices in the same row, col, and box as idx (not including idx itself)
export function getPeers(idx) {
  const row = getRow(idx)
  const col = getCol(idx)
  const box = getBox(idx)
  const peers = new Set()
  for (let i = 0; i < 81; i++) {
    if (i !== idx && (getRow(i) === row || getCol(i) === col || getBox(i) === box)) {
      peers.add(i)
    }
  }
  return peers
}

// All cell indices in the same row, col, and box as idx (including idx)
export function getGroup(idx) {
  const peers = getPeers(idx)
  peers.add(idx)
  return peers
}

// Set of indices that are in conflict (same digit in same row/col/box)
export function getConflicts(cells) {
  const conflicts = new Set()
  for (let i = 0; i < 81; i++) {
    const d = cells[i].digit
    if (d === 0) continue
    for (const j of getPeers(i)) {
      if (cells[j].digit === d) {
        conflicts.add(i)
        conflicts.add(j)
      }
    }
  }
  return conflicts
}

// Parse an 81-char grid string into a cells array
export function parsePuzzle(grid) {
  return Array.from(grid).map(ch => {
    const digit = parseInt(ch, 10)
    return { digit, isGiven: digit !== 0 }
  })
}

// True if all cells are filled and no conflicts exist
export function isComplete(cells) {
  return cells.every(c => c.digit !== 0) && getConflicts(cells).size === 0
}

// Indices of all other cells containing the same non-zero digit as cells[idx]
export function getSameDigitCells(cells, idx) {
  const d = cells[idx]?.digit
  if (!d) return new Set()
  const result = new Set()
  for (let i = 0; i < 81; i++) {
    if (i !== idx && cells[i].digit === d) result.add(i)
  }
  return result
}

// Format seconds as MM:SS
export function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
