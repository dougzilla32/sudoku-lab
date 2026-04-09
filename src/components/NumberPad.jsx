export default function NumberPad({ notesMode, setNotesMode, hintsLeft, onDigit, onErase, onUndo, onHint }) {
  return (
    <div className="numpad">
      <div className="numpad__digits">
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="numpad__digit" onClick={() => onDigit(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="numpad__actions">
        <button className="numpad__action" onClick={onUndo} title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14L4 9l5-5"/>
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
          </svg>
          Undo
        </button>
        <button
          className={`numpad__action ${notesMode ? 'numpad__action--active' : ''}`}
          onClick={() => setNotesMode(m => !m)}
          title="Toggle notes mode"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          {notesMode ? 'Notes ON' : 'Notes'}
        </button>
        <button className="numpad__action" onClick={onErase} title="Erase cell">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16l10-10 7 7-1.5 1.5"/>
            <path d="M6.5 17.5l5-5"/>
          </svg>
          Erase
        </button>
        <button
          className="numpad__action numpad__action--hint"
          onClick={onHint}
          disabled={hintsLeft === 0}
          title={`Use hint (+30s). ${hintsLeft} remaining.`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Hint ({hintsLeft})
        </button>
      </div>
    </div>
  )
}
