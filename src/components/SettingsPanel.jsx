export default function SettingsPanel({ settings, updateSetting, onClose }) {
  const rows = [
    { key: 'highlightDuplicates', label: 'Highlight duplicate digits' },
    { key: 'highlightSelection',  label: 'Highlight row / column / box' },
    { key: 'autoClearNotes',      label: 'Auto-clear notes on placement' },
    { key: 'soundEffects',        label: 'Sound effects' },
  ]

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-panel__header">
          <h2>Settings</h2>
          <button className="settings-panel__close" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="settings-panel__rows">
          {rows.map(({ key, label }) => (
            <label key={key} className="settings-row">
              <span className="settings-row__label">{label}</span>
              <button
                className={`toggle ${settings[key] ? 'toggle--on' : ''}`}
                onClick={() => updateSetting(key, !settings[key])}
                role="switch"
                aria-checked={settings[key]}
              >
                <span className="toggle__thumb" />
              </button>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
