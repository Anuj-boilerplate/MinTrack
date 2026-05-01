import { useState } from 'react';

export default function PomodoroConfigModal({ onClose, onStart }) {
  const [focusLen, setFocusLen] = useState(25);
  const [breakLen, setBreakLen] = useState(5);
  const [cycles, setCycles] = useState(4);

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({ focusLength: focusLen, breakLength: breakLen, cycles });
  };

  return (
    <div id="pomodoro-modal" className="modal-backdrop">
      <div className="modal-pane iridescent-border">
        <h2 className="text-medium mb-6 text-text-primary">Configure Session</h2>
        <form id="pomodoro-form" onSubmit={handleSubmit}>
          <div className="mb-9">
            <label htmlFor="focus-len" className="block text-sm text-text-secondary mb-3">Focus Time (minutes)</label>
            <input type="number" id="focus-len" className="input-field" min="1" required value={focusLen} onChange={e => setFocusLen(parseInt(e.target.value))} />
          </div>
          <div className="mb-9">
            <label htmlFor="break-len" className="block text-sm text-text-secondary mb-3">Break Time (minutes)</label>
            <input type="number" id="break-len" className="input-field" min="1" required value={breakLen} onChange={e => setBreakLen(parseInt(e.target.value))} />
          </div>
          <div className="mb-9">
            <label htmlFor="cycles-count" className="block text-sm text-text-secondary mb-3">Cycles</label>
            <input type="number" id="cycles-count" className="input-field" min="1" required value={cycles} onChange={e => setCycles(parseInt(e.target.value))} />
          </div>
          <div className="flex justify-end gap-6 mt-12">
            <button type="button" className="text-btn" id="cancel-pomodoro-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Start</button>
          </div>
        </form>
      </div>
    </div>
  );
}
