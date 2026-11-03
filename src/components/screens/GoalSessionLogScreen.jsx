import { useState } from 'react';
import { toLocalDateString } from '../../utils';

export default function GoalSessionLogScreen({ goal, onSave, onBack }) {
  const [date, setDate] = useState(toLocalDateString());
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!goal) return <section className="page-content"><div className="empty-state"><h2>Goal not found</h2><button type="button" className="text-action" onClick={onBack}>Back to goals</button></div></section>;

  const submit = async event => {
    event.preventDefault();
    const duration = (Number.parseInt(hours, 10) || 0) * 60 + (Number.parseInt(minutes, 10) || 0);
    if (duration <= 0) return setError('Enter a study duration greater than zero.');
    setError('');
    setSaving(true);
    try {
      const saved = await onSave(goal.id, duration, date);
      if (!saved) setError('Could not save this session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-content narrow-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">Goals · {goal.name}</p><h1 className="page-title">Log study time</h1><p className="page-description">Add a completed session to this goal.</p></div>
        <button type="button" className="quiet-button" onClick={onBack}>Back to goals</button>
      </div>
      <form className="form-panel goal-log-form" onSubmit={submit}>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="field-group"><label className="field-label" htmlFor="goal-session-date">Study date</label><input id="goal-session-date" type="date" className="app-input" value={date} onChange={event => setDate(event.target.value)} /></div>
        <fieldset className="goal-duration-fieldset"><legend className="field-label">Duration</legend>
          <div className="goal-duration-inputs">
            <div className="field-group"><label className="field-optional" htmlFor="goal-session-hours">Hours</label><input id="goal-session-hours" className="app-input" type="number" min="0" max="24" step="1" value={hours} onChange={event => setHours(event.target.value)} placeholder="0" /></div>
            <div className="field-group"><label className="field-optional" htmlFor="goal-session-minutes">Minutes</label><input id="goal-session-minutes" className="app-input" type="number" min="0" max="59" step="1" value={minutes} onChange={event => setMinutes(event.target.value)} placeholder="0" /></div>
          </div>
        </fieldset>
        <div className="form-actions"><button type="button" className="quiet-button" onClick={onBack} disabled={saving}>Cancel</button><button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving…' : 'Save session'}</button></div>
      </form>
    </section>
  );
}
