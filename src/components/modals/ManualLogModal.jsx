import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getSessionRangeFromTimes } from '../../utils';

export default function ManualLogModal({ onClose, onLog }) {
  const { state } = useStateContext();
  const [subjectId, setSubjectId] = useState(state.subjects.length > 0 ? state.subjects[0].id : '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return;

    const range = getSessionRangeFromTimes(startTime, endTime);
    const diffMins = range?.durationMinutes ?? 0;

    if (diffMins < 15) {
      alert('Sessions must be at least 15 minutes long to count.');
      return;
    }

    onLog(subjectId, startTime, endTime, diffMins);
  };

  return (
    <div id="manual-log-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Log Past Session</h2>
        <form id="manual-log-form" onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="manual-log-subject" className="block text-sm text-text-secondary mb-2">Subject</label>
            <select id="manual-log-subject" className="input-field" required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id} className="bg-background-main text-text-primary">{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="manual-start-time" className="block text-sm text-text-secondary mb-2">Start Time</label>
              <input type="time" id="manual-start-time" className="input-field" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label htmlFor="manual-end-time" className="block text-sm text-text-secondary mb-2">End Time</label>
              <input type="time" id="manual-end-time" className="input-field" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <p className="text-sm text-brand-danger mb-6">Sessions must be at least 15 minutes long to count.</p>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" className="text-btn" id="cancel-manual-log-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Log Time</button>
          </div>
        </form>
      </div>
    </div>
  );
}
