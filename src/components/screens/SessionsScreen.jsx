import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { formatHoursToMins } from '../../utils';

function sessionLabel(session) {
  const start = new Date(session.start_time);
  const date = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const end = new Date(session.end_time);
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} | ${startTime} - ${endTime}`;
}

export default function SessionsScreen({ onDeleteSession }) {
  const { state } = useStateContext();
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const sessions = state.subjects.flatMap(subject => (subject.sessions || [])
    .filter(session => !session.is_discarded)
    .map(session => ({ ...session, subjectName: subject.name, color: subject.accentColor }))
  ).sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
  const totalMinutes = sessions.reduce((total, session) => total + (session.duration_minutes || 0), 0);

  const confirmDelete = async sessionId => {
    setDeleteError('');
    setDeletingId(sessionId);
    try {
      const deleted = await onDeleteSession(sessionId);
      if (deleted) setPendingDeleteId(null);
      else setDeleteError('Could not delete this session. Please try again.');
    } catch {
      setDeleteError('Could not delete this session. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="page-content">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Study record</p>
          <h1 className="page-title">Sessions</h1>
          <p className="page-description">Your logged study time for {state.term?.name || 'this term'}.</p>
        </div>
        <div className="summary-chip"><span>{sessions.length} sessions</span><strong>{formatHoursToMins(totalMinutes / 60)}</strong></div>
      </div>
      {sessions.length ? (
        <div className="session-list">
          {sessions.map(session => (
            <article className="session-row" key={session.id}>
              <span className="session-color" style={{ backgroundColor: session.color }} />
              <div className="session-row-copy"><h2>{session.subjectName}</h2><p>{sessionLabel(session)}</p>
                {pendingDeleteId === session.id && <div className="session-delete-confirm"><span>Delete this session?</span><button type="button" className="quiet-button" onClick={() => { setPendingDeleteId(null); setDeleteError(''); }}>Cancel</button><button type="button" className="danger-action" disabled={deletingId === session.id} onClick={() => confirmDelete(session.id)}>{deletingId === session.id ? 'Deleting...' : 'Delete'}</button></div>}
                {deleteError && pendingDeleteId === session.id && <p className="inline-error" role="alert">{deleteError}</p>}
              </div>
              <strong className="session-duration">{formatHoursToMins((session.duration_minutes || 0) / 60)}</strong>
              <button type="button" className="icon-action" aria-label={`Delete ${session.subjectName} session`} title="Delete session" onClick={() => { setPendingDeleteId(session.id); setDeleteError(''); }}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></svg>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state"><h2>No sessions recorded</h2><p>Start a focus session or log study time from a goal to see it here.</p></div>
      )}
    </section>
  );
}
