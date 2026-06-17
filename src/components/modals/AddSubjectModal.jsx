import { useState, useCallback, useEffect, useRef, memo } from 'react';
import DatePicker from '../DatePicker';
import { motion } from 'framer-motion';

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
      <label htmlFor={id} className="stepper-label modal-label">{label}</label>
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
          className="stepper-value animate-none"
          style={{ width: '85px', caretColor: 'var(--accent-soft)' }}
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
    <motion.div
      id="add-subject-modal"
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-6">
          <h2 className="modal-heading m-0">Add Goal</h2>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-text-primary hover:bg-text-primary/5 transition-colors focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form id="subject-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label htmlFor="subject-name" className="modal-label block mb-2">Goal Name</label>
            <input
              type="text"
              id="subject-name"
              className="input-field"
              required
              placeholder="e.g. Calculus"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ caretColor: 'var(--accent-soft)' }}
            />
          </div>
          <div>
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
          <div>
            <label htmlFor="subject-deadline" className="modal-label block mb-2">Goal Deadline (Optional)</label>
            <DatePicker 
              id="subject-deadline" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
              placeholder="e.g. 2026-06-30"
            />
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-text-primary/5">
            <button 
              type="submit" 
              className="px-6 py-3 rounded-full text-sm font-medium bg-text-primary/10 text-text-primary hover:bg-text-primary/20 transition-colors border border-text-primary/10"
            >
              Add Goal
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

