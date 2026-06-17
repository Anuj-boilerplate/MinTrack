import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { formatHoursToMins } from '../../utils';
import DatePicker from '../DatePicker';

// ---------------------------------------------------------------------------
// StepperRow — memo'd so only the row whose value changed re-renders
// ---------------------------------------------------------------------------
const StepperRow = memo(function StepperRow({ label, value, onChange, onBlur, onAdjust, id, required, placeholder }) {
  const repeatTimeoutRef = useRef(null);
  const repeatIntervalRef = useRef(null);

  const stopRepeat = useCallback(() => {
    clearTimeout(repeatTimeoutRef.current);
    clearInterval(repeatIntervalRef.current);
  }, []);

  const startRepeat = useCallback((amount) => {
    stopRepeat();
    onAdjust(amount);
    repeatTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => onAdjust(amount), 85);
    }, 380);
  }, [onAdjust, stopRepeat]);

  useEffect(() => stopRepeat, [stopRepeat]);

  return (
    <div className="stepper-row">
      <label htmlFor={id} className="stepper-label">{label}</label>
      <div className="stepper-control">
        <button
          type="button"
          className="stepper-btn select-none"
          onMouseDown={() => startRepeat(-1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(-1)}
          onTouchEnd={stopRepeat}
        >−</button>
        <input
          type="number"
          id={id}
          className="stepper-value"
          style={{ width: '85px' }}
          value={value}
          min="1"
          required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="stepper-btn select-none"
          onMouseDown={() => startRepeat(1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(1)}
          onTouchEnd={stopRepeat}
        >+</button>
      </div>
    </div>
  );
});

export default function EditSubjectModal({ subject, onClose, onSave, onDelete }) {
  const [name, setName] = useState(subject?.name || '');
  const [target, setTarget] = useState(String(subject?.target_hours || subject?.targetHours || ''));
  const [deadline, setDeadline] = useState(subject?.deadline ? subject.deadline.split('T')[0] : '');

  const adjustTarget = useCallback((d) => setTarget((p) => {
    const val = parseInt(p);
    if (isNaN(val)) {
      return d > 0 ? '1' : '1';
    }
    return String(Math.max(1, val + d));
  }), []);

  const blurTarget = useCallback(() => setTarget((p) => p === '' ? '' : String(Math.max(1, parseInt(p) || 1))), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(subject.id, name, parseFloat(target), deadline ? new Date(deadline).toISOString() : null);
  };

  if (!subject) return null;

  return (
    <div id="edit-subject-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-medium text-text-primary">Edit Goal</h2>
          <button type="button" className="icon-btn hover:bg-brand-danger hover:border-brand-danger hover:text-white" id="delete-subject-btn" title="Delete Goal" onClick={() => onDelete(subject.id)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
          </button>
        </div>
        <form id="edit-subject-form" onSubmit={handleSubmit}>
          <div className="mb-9">
            <label htmlFor="edit-subject-name" className="block text-sm text-text-secondary mb-3">Goal Name</label>
            <input type="text" id="edit-subject-name" className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-9">
            <StepperRow
              label="Total Target Hours"
              value={target}
              onChange={setTarget}
              onBlur={blurTarget}
              onAdjust={adjustTarget}
              id="edit-target-hours"
              required
              placeholder="e.g. 100"
            />
          </div>
          <div className="mb-9">
            <label htmlFor="edit-subject-deadline" className="block text-sm text-text-secondary mb-3">Goal Deadline (Optional)</label>
            <DatePicker 
              id="edit-subject-deadline" 
              value={deadline} 
              onChange={(e) => setDeadline(e.target.value)} 
              placeholder="e.g. 2026-06-30"
            />
          </div>
          <div className="mb-9">
            <label className="block text-sm text-text-secondary mb-3">Paused Time</label>
            <div id="edit-paused-time" className="text-text-secondary opacity-70 text-sm">
              {formatHoursToMins(subject.paused_time_total || 0)}
            </div>
          </div>
          <div className="flex justify-end gap-6 mt-12">
            <button type="button" className="text-btn" id="cancel-edit-subject-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

