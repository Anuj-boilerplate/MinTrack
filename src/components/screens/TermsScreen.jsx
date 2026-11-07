import { useEffect, useRef, useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import DatePicker from '../DatePicker';

export default function TermsScreen() {
  const { state, createTerm, switchTerm, updateTerm, deleteTerm } = useStateContext();
  const [form, setForm] = useState(null);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [openMenuTermId, setOpenMenuTermId] = useState(null);
  const [confirmDeleteTermId, setConfirmDeleteTermId] = useState(null);
  const menuButtonRefs = useRef({});
  const menuItemRefs = useRef({});

  useEffect(() => {
    if (!openMenuTermId) return undefined;
    menuItemRefs.current[openMenuTermId]?.[0]?.focus();

    const closeOnPointerDown = event => {
      if (!event.target.closest('.term-row-actions')) setOpenMenuTermId(null);
    };
    const handleMenuKeys = event => {
      if (event.key === 'Escape') {
        setOpenMenuTermId(null);
        menuButtonRefs.current[openMenuTermId]?.focus();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const items = menuItemRefs.current[openMenuTermId] || [];
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0
        : event.key === 'End' ? items.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    };

    document.addEventListener('pointerdown', closeOnPointerDown);
    document.addEventListener('keydown', handleMenuKeys);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown);
      document.removeEventListener('keydown', handleMenuKeys);
    };
  }, [openMenuTermId]);

  const closeForm = () => {
    setForm(null);
    setName('');
    setStartDate('');
    setEndDate('');
    setError('');
  };

  const beginCreate = () => {
    setOpenMenuTermId(null);
    setConfirmDeleteTermId(null);
    setForm({ mode: 'create' });
    setName('');
    setStartDate('');
    setEndDate('');
    setError('');
  };

  const beginEdit = term => {
    setOpenMenuTermId(null);
    setConfirmDeleteTermId(null);
    setForm({ mode: 'edit', termId: term.id });
    setName(term.name);
    setStartDate(term.start_date?.slice(0, 10) || '');
    setEndDate(term.end_date?.slice(0, 10) || '');
    setError('');
  };

  const handleSave = async event => {
    event.preventDefault();
    setError('');
    if (!name.trim()) return setError('Enter a name for this term.');
    if (!startDate || !endDate) return setError('Choose both dates.');
    if (endDate < startDate) return setError('The end date must be on or after the start date.');
    setSaving(true);
    const result = form.mode === 'create'
      ? await createTerm(name.trim(), startDate, endDate)
      : await updateTerm(form.termId, name.trim(), startDate, endDate);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || `The term could not be ${form.mode === 'create' ? 'created' : 'updated'}.`);
      return;
    }
    closeForm();
  };

  const handleDelete = async term => {
    setError('');
    setSaving(true);
    const result = await deleteTerm(term.id);
    setSaving(false);
    if (!result?.ok) {
      setError(result?.error || 'The term could not be deleted.');
      return;
    }
    setConfirmDeleteTermId(null);
  };

  const openContextMenu = (event, termId) => {
    event.preventDefault();
    setForm(null);
    setConfirmDeleteTermId(null);
    setError('');
    setOpenMenuTermId(termId);
  };

  const displayDate = value => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date';

  const renderForm = (mode, termId) => (
    <form className="form-panel term-create-panel" onSubmit={handleSave}>
      <h2 className="section-title">{mode === 'create' ? 'Create a term' : 'Edit term'}</h2>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="form-grid-two">
        <div className="field-group"><label className="field-label" htmlFor={`term-name-${termId || 'new'}`}>Term name</label><input id={`term-name-${termId || 'new'}`} className="app-input" maxLength={80} autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Fall 2026" /></div>
        <div className="field-group"><label className="field-label" htmlFor={`term-start-${termId || 'new'}`}>Start date</label><DatePicker id={`term-start-${termId || 'new'}`} value={startDate} onChange={event => setStartDate(event.target.value)} /></div>
        <div className="field-group"><label className="field-label" htmlFor={`term-end-${termId || 'new'}`}>End date</label><DatePicker id={`term-end-${termId || 'new'}`} value={endDate} onChange={event => setEndDate(event.target.value)} /></div>
      </div>
      <div className="form-actions"><button className="quiet-button" type="button" onClick={closeForm}>Cancel</button><button className="primary-action" type="submit" disabled={saving}>{saving ? 'Saving…' : mode === 'create' ? 'Create and switch' : 'Save changes'}</button></div>
    </form>
  );

  return (
    <section className="page-content">
      <div className="page-heading-row">
        <div><p className="eyebrow">Workspace</p><h1 className="page-title">Terms</h1><p className="page-description">Keep each term’s goals and study history together.</p></div>
        <button className="primary-action" type="button" onClick={form?.mode === 'create' ? closeForm : beginCreate}>
          {form?.mode === 'create' ? 'Close form' : 'Add term'}
        </button>
      </div>

      {form?.mode === 'create' && renderForm('create', null)}

      <div className="terms-list" aria-label="Your terms">
        {state.terms.map(term => {
          const active = term.id === state.activeTermId;
          const menuOpen = openMenuTermId === term.id;
          const editing = form?.mode === 'edit' && form.termId === term.id;
          const confirmingDelete = confirmDeleteTermId === term.id;
          return (
            <article className="term-entry" key={term.id} onContextMenu={event => openContextMenu(event, term.id)}>
              <div className={`term-row${active ? ' is-active' : ''}`}>
                <div className="term-row-main"><span className="term-status-dot" aria-hidden="true" /><div><h2>{term.name}</h2><p>{displayDate(term.start_date)} – {displayDate(term.end_date)}</p></div></div>
                <div className="term-row-controls">
                  {active ? <span className="active-tag">Current term</span> : <button type="button" className="quiet-button" disabled={Boolean(state.activeSession)} onClick={() => switchTerm(term.id)}>Switch to term</button>}
                  <div className="term-row-actions">
                    <button
                      ref={node => { menuButtonRefs.current[term.id] = node; }}
                      type="button"
                      className="term-menu-trigger"
                      aria-label={`Actions for ${term.name}`}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-controls={`term-menu-${term.id}`}
                      onClick={() => { setOpenMenuTermId(menuOpen ? null : term.id); setError(''); }}
                    >
                      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                    </button>
                    {menuOpen && (
                      <div id={`term-menu-${term.id}`} className="term-action-menu" role="menu" aria-label={`${term.name} actions`}>
                        <button ref={node => { menuItemRefs.current[term.id] = [node, menuItemRefs.current[term.id]?.[1]]; }} type="button" role="menuitem" disabled={Boolean(state.activeSession)} onClick={() => beginEdit(term)}>Edit term</button>
                        <button ref={node => { menuItemRefs.current[term.id] = [menuItemRefs.current[term.id]?.[0], node]; }} type="button" role="menuitem" className="is-danger" disabled={Boolean(state.activeSession)} onClick={() => { setOpenMenuTermId(null); setConfirmDeleteTermId(term.id); setError(''); }}>Delete term</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {editing && renderForm('edit', term.id)}
              {confirmingDelete && (
                <div className="term-delete-confirm" role="group" aria-label={`Confirm deleting ${term.name}`}>
                  <div><h3>Delete {term.name}?</h3><p>This permanently deletes the term’s goals, tasks, and study sessions.</p></div>
                  {error && <p className="inline-error" role="alert">{error}</p>}
                  <div className="form-actions"><button className="quiet-button" type="button" disabled={saving} onClick={() => { setConfirmDeleteTermId(null); setError(''); }}>Cancel</button><button className="danger-action" type="button" disabled={saving || Boolean(state.activeSession)} onClick={() => handleDelete(term)}>{saving ? 'Deleting…' : 'Delete term'}</button></div>
                </div>
              )}
            </article>
          );
        })}
        {!state.terms.length && <div className="empty-state"><h2>No terms yet</h2><p>Create a term to start adding goals and tracking study time.</p></div>}
      </div>
    </section>
  );
}
