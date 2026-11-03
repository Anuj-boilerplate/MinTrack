import { useState } from 'react';
import DatePicker from '../DatePicker';

export default function GoalEditScreen({ goal, onSave, onDelete, onChooseColor, onBack }) {
  const [name, setName] = useState(goal?.name || '');
  const [targetHours, setTargetHours] = useState(String(goal?.target_hours || ''));
  const [deadline, setDeadline] = useState(goal?.deadline ? goal.deadline.split('T')[0] : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!goal) return <section className="page-content"><div className="empty-state"><h2>Goal not found</h2><button type="button" className="text-action" onClick={onBack}>Back to goals</button></div></section>;

  const submit = async event => {
    event.preventDefault();
    setError('');
    const target = Number(targetHours);
    if (!name.trim()) return setError('Enter a name for this goal.');
    if (!Number.isFinite(target) || target <= 0) return setError('Enter a target greater than zero.');
    setSaving(true);
    try {
      const saved = await onSave(goal.id, name.trim(), target, deadline ? new Date(`${deadline}T12:00:00`).toISOString() : null);
      if (!saved) setError('Could not save this goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = async () => {
    setError('');
    setSaving(true);
    try {
      const deleted = await onDelete(goal.id);
      if (!deleted) setError('Could not delete this goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-content narrow-page goal-edit-page">
      <div className="page-heading-row">
        <div><p className="eyebrow">Goals</p><h1 className="page-title">Edit goal</h1><p className="page-description">Update {goal.name} and its study target.</p></div>
        <button type="button" className="quiet-button" onClick={onBack}>Back to goals</button>
      </div>

      <form className="form-panel goal-edit-form" onSubmit={submit}>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="field-group">
          <label className="field-label" htmlFor="edit-goal-name">Goal name</label>
          <input id="edit-goal-name" className="app-input" autoFocus maxLength={80} value={name} onChange={event => setName(event.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="edit-goal-target">Target study hours</label>
          <input id="edit-goal-target" className="app-input" type="number" min="1" step="0.5" value={targetHours} onChange={event => setTargetHours(event.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="edit-goal-deadline">Deadline <span className="field-optional">Optional</span></label>
          <DatePicker id="edit-goal-deadline" value={deadline} onChange={event => setDeadline(event.target.value)} placeholder="Choose a date" />
        </div>

        <div className="goal-appearance-row">
          <div className="goal-appearance-copy">
            <span className="goal-appearance-swatch" style={{ backgroundColor: goal.accentColor || '#7652ed' }} />
            <div><h2>Goal color</h2><p>Choose a preset or make a custom color.</p></div>
          </div>
          <button type="button" className="secondary-action" onClick={() => onChooseColor(goal.id)}>Change color</button>
        </div>

        {confirmDelete && (
          <div className="goal-delete-confirm-panel" role="group" aria-label="Confirm goal deletion">
            <div><strong>Delete {goal.name}?</strong><p>This also removes its associated study history.</p></div>
            <button type="button" className="quiet-button" onClick={() => setConfirmDelete(false)} disabled={saving}>Keep goal</button>
            <button type="button" className="danger-action" onClick={removeGoal} disabled={saving}>{saving ? 'Deleting…' : 'Delete goal'}</button>
          </div>
        )}

        <div className="goal-edit-footer">
          {!confirmDelete && <button type="button" className="danger-text-action" onClick={() => setConfirmDelete(true)}>Delete goal</button>}
          <div className="goal-edit-footer-actions">
            <button type="button" className="quiet-button" onClick={onBack} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-action" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </section>
  );
}
