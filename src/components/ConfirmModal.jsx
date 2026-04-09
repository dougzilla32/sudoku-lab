export default function ConfirmModal({ title, message, confirmLabel = 'Leave', cancelLabel = 'Stay', onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal confirm-modal" onClick={e => e.stopPropagation()}>
        <h2 className="confirm-modal__title">{title}</h2>
        <p className="confirm-modal__message">{message}</p>
        <div className="confirm-modal__actions">
          <button className="btn btn--ghost confirm-modal__cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={`btn confirm-modal__confirm${danger ? ' btn--danger' : ' btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
