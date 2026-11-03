import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import DatePicker from '../DatePicker';

export default function TermsScreen() {
  const { state, createTerm, switchTerm } = useStateContext();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async event => {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name for this term.');
    if (!startDate || !endDate) return setError('Choose both dates.');
    if (endDate < startDate) return setError('The end date must be on or after the start date.');
    setSaving(true);
    try {
      const result = await createTerm(name.trim(), startDate, endDate);
      if (!result?.ok) setError(result?.error || 'The term could not be created.');
      else {
        setName(''); setStartDate(''); setEndDate(''); setIsCreating(false);
      }
    } catch (createError) {
      setError(createError?.message || 'The term could not be created. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';

  return (
    <section className="page-content">
      <div className="page-heading-row">
        <div><p className="eyebrow">Workspace</p><h1 className="page-title">Terms</h1><p className="page-description">Keep each term’s goals and study history together.</p></div>
        <button className="primary-action" type="button" onClick={() => { setIsCreating(value => !value); setError(''); }}>
          {isCreating ? 'Close form' : 'Add term'}
        </button>
      </div>

      {isCreating && (
        <form className="form-panel term-create-panel" onSubmit={handleCreate}>
          <h2 className="section-title">Create a term</h2>
          {error && <p className="inline-error" role="alert">{error}</p>}
          <div className="form-grid-two">
            <div className="field-group"><label className="field-label" htmlFor="term-name">Term name</label><input id="term-name" className="app-input" maxLength={80} autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Fall 2026" /></div>
            <div className="field-group"><label className="field-label" htmlFor="term-start">Start date</label><DatePicker id="term-start" value={startDate} onChange={event => setStartDate(event.target.value)} /></div>
            <div className="field-group"><label className="field-label" htmlFor="term-end">End date</label><DatePicker id="term-end" value={endDate} onChange={event => setEndDate(event.target.value)} /></div>
          </div>
          <div className="form-actions"><button className="quiet-button" type="button" onClick={() => setIsCreating(false)}>Cancel</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create and switch'}</button></div>
        </form>
      )}

      <div className="terms-list" aria-label="Your terms">
        {state.terms.map(term => {
          const active = term.id === state.activeTermId;
          return (
            <article className={`term-row${active ? ' is-active' : ''}`} key={term.id}>
              <div className="term-row-main"><span className="term-status-dot" aria-hidden="true" /><div><h2>{term.name}</h2><p>{displayDate(term.start_date)} – {displayDate(term.end_date)}</p></div></div>
              {active ? <span className="active-tag">Current term</span> : <button type="button" className="quiet-button" disabled={Boolean(state.activeSession)} onClick={() => switchTerm(term.id)}>Switch to term</button>}
            </article>
          );
        })}
        {!state.terms.length && <div className="empty-state"><h2>No terms yet</h2><p>Create a term to start adding goals and tracking study time.</p></div>}
      </div>
    </section>
  );
}
