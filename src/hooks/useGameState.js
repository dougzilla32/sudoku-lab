import { useState, useCallback } from 'react'
import { parsePuzzle, getConflicts, isComplete, getPeers, getSameDigitCells, getGroup } from '../lib/sudoku'

const MAX_HISTORY = 20

function cloneCells(cells) {
  return cells.map(c => ({ ...c }))
}

function cloneNotes(notes) {
  return notes.map(s => new Set(s))
}

export function useGameState(puzzle, settings) {
  const [cells, setCells]         = useState(() => parsePuzzle(puzzle.grid))
  const [notes, setNotes]         = useState(() => Array(81).fill(null).map(() => new Set()))
  const [selected, setSelected]   = useState(null)
  const [notesMode, setNotesMode] = useState(false)
  const [history, setHistory]     = useState([])
  const [hintsLeft, setHintsLeft]     = useState(3)
  const [hintPenalty, setHintPenalty] = useState(0)
  const [mistakes, setMistakes]   = useState(0)
  const [complete, setComplete]   = useState(false)

  function pushHistory(c, n) {
    setHistory(h => [...h.slice(-(MAX_HISTORY - 1)), { cells: cloneCells(c), notes: cloneNotes(n) }])
  }

  const enterDigit = useCallback((digit) => {
    if (selected === null) return
    if (cells[selected].isGiven) return

    if (notesMode) {
      pushHistory(cells, notes)
      const nextNotes = cloneNotes(notes)
      if (nextNotes[selected].has(digit)) {
        nextNotes[selected].delete(digit)
      } else {
        nextNotes[selected].add(digit)
      }
      setNotes(nextNotes)
      return
    }

    pushHistory(cells, notes)

    const nextCells = cloneCells(cells)
    nextCells[selected] = { ...nextCells[selected], digit }

    if (digit !== 0 && digit !== parseInt(puzzle.solution[selected], 10)) {
      setMistakes(m => m + 1)
    }

    const nextNotes = cloneNotes(notes)
    if (settings.autoClearNotes && digit !== 0) {
      for (const i of getGroup(selected)) {
        if (i !== selected) nextNotes[i].delete(digit)
      }
    }

    if (isComplete(nextCells)) setComplete(true)

    setCells(nextCells)
    setNotes(nextNotes)
  }, [selected, cells, notes, notesMode, puzzle, settings])

  const erase = useCallback(() => {
    if (selected === null) return
    if (cells[selected].isGiven) return
    pushHistory(cells, notes)
    const nextCells = cloneCells(cells)
    const nextNotes = cloneNotes(notes)
    if (cells[selected].digit !== 0) {
      // First erase: remove the digit, reveal notes underneath
      nextCells[selected] = { ...nextCells[selected], digit: 0 }
    } else {
      // Second erase: cell is empty, clear any notes
      nextNotes[selected] = new Set()
    }
    setCells(nextCells)
    setNotes(nextNotes)
  }, [selected, cells, notes])

  const undo = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCells(prev.cells)
    setNotes(prev.notes)
  }, [history])

  const fillAll = useCallback(() => {
    const filled = cells.map((c, i) =>
      c.isGiven ? c : { ...c, digit: parseInt(puzzle.solution[i], 10) }
    )
    setCells(filled)
    setNotes(Array(81).fill(null).map(() => new Set()))
    setComplete(true)
  }, [cells, puzzle])

  const useHint = useCallback(() => {
    if (selected === null || hintsLeft <= 0) return
    if (cells[selected].isGiven) return
    const correct = parseInt(puzzle.solution[selected], 10)
    if (cells[selected].digit === correct) return

    pushHistory(cells, notes)
    const nextCells = cloneCells(cells)
    nextCells[selected] = { ...nextCells[selected], digit: correct }

    const nextNotes = cloneNotes(notes)
    if (settings.autoClearNotes) {
      for (const i of getGroup(selected)) {
        if (i !== selected) nextNotes[i].delete(correct)
      }
    }

    setHintsLeft(h => h - 1)
    setHintPenalty(p => p + 30)
    if (isComplete(nextCells)) setComplete(true)

    setCells(nextCells)
    setNotes(nextNotes)
  }, [selected, cells, notes, hintsLeft, puzzle, settings])

  const conflicts  = getConflicts(cells)
  const peers      = selected !== null ? getPeers(selected) : new Set()
  const sameDigits = selected !== null ? getSameDigitCells(cells, selected) : new Set()

  return {
    cells, notes, selected, setSelected,
    notesMode, setNotesMode,
    hintsLeft, hintPenalty, mistakes, complete,
    conflicts, peers, sameDigits,
    enterDigit, erase, undo, useHint, fillAll,
  }
}
