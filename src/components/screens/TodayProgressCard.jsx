import { useMemo } from 'react';
import { toLocalDateString } from '../../utils';

function formatTarget(hours) {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (wholeHours && minutes) return `${wholeHours}h ${minutes}m`;
  if (wholeHours) return `${wholeHours}h`;
  return `${minutes}m`;
}

export default function TodayProgressCard({ subjects, onGoalClick }) {
  const today = toLocalDateString();
  const { perSubject, totalTarget, totalStudied } = useMemo(() => {
    const perSubject = subjects
      .filter(subject => (subject.daily_target || 0) > 0)
      .map(subject => {
        const studiedToday = (subject.sessions || [])
          .filter(session => !session.is_discarded)
          .filter(session => toLocalDateString(new Date(session.start_time)) === today)
          .reduce((sum, session) => sum + (session.duration_minutes || 0) / 60, 0);

        return {
          id: subject.id,
          name: subject.name,
          color: subject.accentColor || subject.accent_color || 'var(--text-muted)',
          target: subject.daily_target,
          studiedToday,
        };
      });

    return {
      perSubject,
      totalTarget: perSubject.reduce((sum, subject) => sum + subject.target, 0),
      totalStudied: perSubject.reduce((sum, subject) => sum + subject.studiedToday, 0),
    };
  }, [subjects, today]);

  if (!perSubject.length) {
    return (
      <div className="digest-card today-progress-card digest-card--empty">
        <span className="digest-card__label">Today&rsquo;s goals</span>
        <div className="digest-card__empty-message">
          No daily targets set yet.
          <br />
          <span>Set a daily target on a goal to track today&rsquo;s progress here.</span>
        </div>
      </div>
    );
  }

  const overallPct = Math.min(1, totalTarget > 0 ? totalStudied / totalTarget : 0);
  const remaining = Math.max(0, totalTarget - totalStudied);
  const verdict = overallPct >= 1
    ? 'All goals met for today. Well done.'
    : overallPct >= 0.75
      ? 'Almost there — one more push.'
      : overallPct >= 0.5
        ? 'Halfway through. Keep it going.'
        : overallPct >= 0.25
          ? 'Off to a start. More to do.'
          : 'Day’s barely begun. Time to open the books.';

  return (
    <div className="digest-card today-progress-card">
      <div className="digest-today__header">
        <span className="digest-card__label">Today&rsquo;s goals</span>
        <span className="digest-today__tally">
          <span className="digest-today__tally-done">{formatTarget(totalStudied)}</span>
          <span className="digest-today__tally-sep">/</span>
          <span className="digest-today__tally-total">{formatTarget(totalTarget)}</span>
        </span>
      </div>

      <div className="digest-today__bar-track" role="meter" aria-label="Today's study goal progress" aria-valuenow={Math.round(overallPct * 100)} aria-valuemin={0} aria-valuemax={100}>
        {perSubject.map((subject, index) => {
          const segmentWidth = (subject.target / totalTarget) * 100;
          const fillPercent = Math.min(1, subject.studiedToday / subject.target) * 100;
          return (
            <div
              key={subject.id}
              className="digest-today__bar-seg"
              style={{ width: `${segmentWidth}%`, borderRight: index === perSubject.length - 1 ? 'none' : '2px solid var(--bg-main)' }}
            >
              <div className="digest-today__bar-seg-fill" style={{ width: `${fillPercent}%`, background: subject.color }} />
            </div>
          );
        })}
      </div>

      <div className="digest-today__legend">
        {perSubject.map(subject => (
          <button
            key={subject.id}
            type="button"
            className="digest-today__legend-item today-progress-goal"
            onClick={() => onGoalClick?.(subject.id)}
            aria-label={`${subject.name}: ${formatTarget(subject.studiedToday)} studied today of ${formatTarget(subject.target)} target`}
          >
            <span className="digest-today__legend-dot" style={{ background: subject.color }} />
            <span className="digest-today__legend-name">{subject.name}</span>
            <span className="digest-today__legend-val">{formatTarget(subject.studiedToday)} / {formatTarget(subject.target)}</span>
          </button>
        ))}
      </div>

      <div className="digest-today__footer">
        {remaining > 0 && <span className="digest-today__remaining">{formatTarget(remaining)} remaining</span>}
        <span className="digest-card__verdict" style={{ marginTop: 0 }}>{verdict}</span>
      </div>
    </div>
  );
}
