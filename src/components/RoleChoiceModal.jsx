export default function RoleChoiceModal({ game, playerCount, onChoose, onCancel }) {
  const statusLabel = game.status === 'active' ? 'in progress' : 'in lobby'

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal role-choice-modal" onClick={e => e.stopPropagation()}>
        <h2 className="role-choice-modal__name">{game.name || game.code}</h2>
        <p className="role-choice-modal__meta">
          {game.difficulty} · {playerCount} {playerCount === 1 ? 'player' : 'players'} · {statusLabel}
        </p>

        <div className="role-choice-modal__options">
          <button className="role-option-btn" onClick={() => onChoose('player')}>
            <span className="role-option-btn__icon">🎮</span>
            <span className="role-option-btn__label">Play</span>
            <span className="role-option-btn__sub">Join the race</span>
          </button>
          <button className="role-option-btn" onClick={() => onChoose('spectator')}>
            <span className="role-option-btn__icon">👁️</span>
            <span className="role-option-btn__label">Watch</span>
            <span className="role-option-btn__sub">See all boards · can't switch to player</span>
          </button>
        </div>

        <button className="btn btn--ghost" style={{ width: '100%' }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
