import { useState } from 'react';
import DatePicker from '../DatePicker';

export default function GoalFormScreen({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [targetHours, setTargetHours] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    const target = Number(targetHours);
    if (!name.trim()) return setError('Enter a name for this goal.');
    if (!Number.isFinite(target) || target <= 0) return setError('Enter a target greater than zero.');
    setSaving(true);
    try {
      const saved = await onSave(name.trim(), target, deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null);
      if (!saved) setError('The goal could not be saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-content narrow-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">Goals</p><h1 className="page-title">Add a goal</h1><p className="page-description">Set a study target for this term.</p></div>
        <button type="button" className="quiet-button" onClick={onCancel}>Back to goals</button>
      </div>
      <form className="form-panel" onSubmit={submit}>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <label className="field-label" htmlFor="goal-name">Goal name</label>
        <input id="goal-name" className="app-input" autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Biology" />
        <label className="field-label" htmlFor="goal-target">Target study hours</label>
        <input id="goal-target" className="app-input" type="number" min="1" step="0.5" value={targetHours} onChange={event => setTargetHours(event.target.value)} placeholder="e.g. 60" />
        <label className="field-label" htmlFor="goal-deadline">Deadline <span className="field-optional">Optional</span></label>
        <DatePicker id="goal-deadline" value={deadline} onChange={event => setDeadline(event.target.value)} placeholder="Choose a date" />
        <div className="form-actions">
          <button type="button" className="quiet-button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving…' : 'Create goal'}</button>
        </div>
      </form>
    </section>
  );
}
