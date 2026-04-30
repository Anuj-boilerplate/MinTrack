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
    <div id="pomodoro-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Configure Session</h2>
        <form id="pomodoro-form" onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="focus-len" className="block text-sm text-text-secondary mb-2">Focus Time (minutes)</label>
            <input type="number" id="focus-len" className="input-field" min="1" required value={focusLen} onChange={e => setFocusLen(parseInt(e.target.value))} />
          </div>
          <div className="mb-6">
            <label htmlFor="break-len" className="block text-sm text-text-secondary mb-2">Break Time (minutes)</label>
            <input type="number" id="break-len" className="input-field" min="1" required value={breakLen} onChange={e => setBreakLen(parseInt(e.target.value))} />
          </div>
          <div className="mb-6">
            <label htmlFor="cycles-count" className="block text-sm text-text-secondary mb-2">Cycles</label>
            <input type="number" id="cycles-count" className="input-field" min="1" required value={cycles} onChange={e => setCycles(parseInt(e.target.value))} />
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" className="text-btn" id="cancel-pomodoro-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Start</button>
          </div>
        </form>
      </div>
    </div>
  );
}
