import { formatTime } from '../lib/sudoku'

export default function CompletionModal({ seconds, hintPenalty, mistakes, hintsUsed, onPlayAgain, onHome }) {
  const total = seconds + hintPenalty
  const baseTime = formatTime(seconds)
  const totalTime = formatTime(total)
  const hasPenalty = hintPenalty > 0

  return (
    <div className="modal-overlay">
      <div className="modal completion-modal">
        <div className="completion-modal__emoji">🎉</div>
        <h2 className="completion-modal__title">Puzzle Solved!</h2>

        <div className="completion-modal__time">
          <span className="completion-modal__time-value">{totalTime}</span>
          {hasPenalty && (
            <span className="completion-modal__time-note">
              {baseTime} + {formatTime(hintPenalty)} hint penalty
            </span>
          )}
        </div>

        <div className="completion-modal__stats">
          <div className="stat">
            <span className="stat__value">{hintsUsed}</span>
            <span className="stat__label">hint{hintsUsed !== 1 ? 's' : ''} used</span>
          </div>
          <div className="stat">
            <span className="stat__value">{mistakes}</span>
            <span className="stat__label">mistake{mistakes !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="completion-modal__actions">
          <button className="btn btn--primary" onClick={onPlayAgain}>Play Again</button>
          <button className="btn btn--ghost" onClick={onHome}>Home</button>
        </div>
      </div>
    </div>
  )
}
