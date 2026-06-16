import { useState, useCallback, useEffect, useRef, memo } from 'react';
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

export default function AddSubjectModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

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
    onAdd(name, parseFloat(target), deadline ? new Date(deadline).toISOString() : null);
  };

  return (
    <div id="add-subject-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border" onClick={e => e.stopPropagation()}>
        <h2 className="text-medium mb-6 text-text-primary">Add Goal</h2>
        <form id="subject-form" onSubmit={handleSubmit}>
          <div className="mb-9">
            <label htmlFor="subject-name" className="block text-sm text-text-secondary mb-3">Goal Name</label>
            <input type="text" id="subject-name" className="input-field" required placeholder="e.g. Calculus" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="mb-9">
            <StepperRow
              label="Total Target Hours"
              value={target}
              onChange={setTarget}
              onBlur={blurTarget}
              onAdjust={adjustTarget}
              id="target-hours"
              required
              placeholder="e.g. 100"
            />
          </div>
          <div className="mb-9">
            <label htmlFor="subject-deadline" className="block text-sm text-text-secondary mb-3">Goal Deadline (Optional)</label>
            <DatePicker 
              id="subject-deadline" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              placeholder="e.g. 2026-06-30"
            />
          </div>
          <div className="flex justify-end gap-6 mt-12">
            <button type="button" className="text-btn" id="cancel-subject-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

