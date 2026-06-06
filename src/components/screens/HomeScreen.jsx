import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, formatHoursToMins, formatISODateForDisplay } from '../../utils';

// ---------------------------------------------------------------------------
// SubjectCard — memo'd child component to prevent redundant card re-renders
// ---------------------------------------------------------------------------
const SubjectCard = memo(function SubjectCard({ sub, isSelected, onSelect, onOpenModal, termEndDate }) {
  const today = new Date();
  const targetHours = parseFloat(sub.target_hours) || 0;
  const validHours = parseFloat(sub.valid_hours) || 0;
  const pct = targetHours > 0 ? Math.min((validHours / targetHours) * 100, 100) : 0;

  const subDeadline = sub.deadline || termEndDate;
  const subDaysLeft = subDeadline ? getDaysLeft(today, subDeadline) : 0;
  const isSubCompleted = validHours >= targetHours;
  const isSubOverdue = subDaysLeft < 0 && !isSubCompleted;

  const handleCardClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(sub.id);
  }, [sub.id, onSelect]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('editSubject', sub.id);
  }, [sub.id, onOpenModal]);

  const handleStartSessionClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('pomodoro', sub.id);
  }, [sub.id, onOpenModal]);

  return (
    <article
      className={`subject-card glass-surface ${isSelected ? 'selected' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex justify-between items-start gap-4 mb-12">
        <div className="min-w-0">
          <button type="button" className="subject-select" onClick={handleCardClick}>
            <span className="text-medium text-text-primary block truncate">{sub.name}</span>
          </button>
          <p className="text-tiny text-text-muted mt-3">{formatHoursToMins(validHours)} of {targetHours}h complete</p>
          {sub.deadline && (
            <p className={`text-tiny mt-2 ${subDaysLeft < 0 && !isSubCompleted ? 'text-[#b86d60]' : 'text-text-muted opacity-80'}`}>
              Deadline: {formatISODateForDisplay(sub.deadline)}
            </p>
          )}
        </div>

        <button
          className="subject-edit-button"
          title="Edit Subject"
          onClick={handleEditClick}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </button>
      </div>

      <div className="subject-progress-block">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }}></div>
        </div>
      </div>

      <div className="mt-auto pt-12">
        {isSubCompleted ? (
          <button className="session-launch-btn w-full opacity-70 cursor-not-allowed text-[#d3a36c] border-[rgba(211,163,108,0.3)]" disabled type="button">
            Completed
          </button>
        ) : isSubOverdue ? (
          <button className="session-launch-btn w-full opacity-80 cursor-not-allowed bg-[rgba(184,109,96,0.15)] text-[#b86d60] border-[rgba(184,109,96,0.3)]" disabled type="button">
            Overdue
          </button>
        ) : subDaysLeft >= 0 ? (
          <button className="session-launch-btn w-full" onClick={handleStartSessionClick} type="button">
            Start Session
          </button>
        ) : (
          <button className="session-launch-btn w-full opacity-60 cursor-not-allowed" disabled type="button">
            Finished
          </button>
        )}
      </div>
    </article>
  );
}, (prevProps, nextProps) => {
  return prevProps.sub === nextProps.sub &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.termEndDate === nextProps.termEndDate;
});

export default function HomeScreen({ onOpenModal, toggleTheme }) {
  const { state } = useStateContext();
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [prevSubjects, setPrevSubjects] = useState(state.subjects);

  // Derived-state pattern (React docs recommended): synchronize selectedSubjectId
  // with the subjects list during render rather than in a useEffect, which would
  // add a wasted extra render cycle after every subjects change.
  if (state.subjects !== prevSubjects) {
    setPrevSubjects(state.subjects);
    if (!state.subjects.length) {
      setSelectedSubjectId(null);
    } else if (selectedSubjectId !== null && !state.subjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(null);
    }
  }

  useEffect(() => {
    const handleGlobalClick = (e) => {
      // If the click is inside a subject card or a modal, don't deselect
      if (e.target.closest('.subject-card') || e.target.closest('.modal-backdrop')) {
        return;
      }
      setSelectedSubjectId(null);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // daysLeft is intentionally not memoized — it's a single cheap date call and
  // must read a fresh Date() on every render to stay accurate across midnight.
  const daysLeft = state.term ? getDaysLeft(new Date(), state.term.endDate) : 0;
  const isTermEnded = daysLeft < 0;

  // Memoized aggregate calculations
  const { totalTarget, totalValid, dailyTargetRequired, dailyTargetCompleted, termPct, dailyPct } = useMemo(() => {
    let targetAccumulator = 0;
    let validAccumulator = 0;
    let dailyTargetReqAccumulator = 0;
    let dailyTargetCompAccumulator = 0;
    
    const todayVal = new Date();

    state.subjects.forEach((sub) => {
      const targetHours = parseFloat(sub.target_hours) || 0;
      const validHours = parseFloat(sub.valid_hours) || 0;
      const completedToday = sub.completed_today || 0;
      targetAccumulator += targetHours;
      validAccumulator += validHours;

      const subjectDeadline = sub.deadline || (state.term ? state.term.endDate : null);
      if (subjectDeadline) {
        const subjectDaysLeft = getDaysLeft(todayVal, subjectDeadline);
        if (subjectDaysLeft >= 0) {
          const todayGoal = Math.max(0, (targetHours - validHours + completedToday) / Math.max(1, subjectDaysLeft) + (sub.carryover || 0));
          dailyTargetReqAccumulator += todayGoal;
        }
        dailyTargetCompAccumulator += completedToday;
      }
    });

    const calculatedTermPct = targetAccumulator > 0 ? Math.min((validAccumulator / targetAccumulator) * 100, 100) : 0;
    const calculatedDailyPct = dailyTargetReqAccumulator > 0 ? Math.min((dailyTargetCompAccumulator / dailyTargetReqAccumulator) * 100, 100) : 0;

    return {
      totalTarget: targetAccumulator,
      totalValid: validAccumulator,
      dailyTargetRequired: dailyTargetReqAccumulator,
      dailyTargetCompleted: dailyTargetCompAccumulator,
      termPct: calculatedTermPct,
      dailyPct: calculatedDailyPct
    };
  }, [state.subjects, state.term]);

  const selectedSubject = useMemo(() => {
    return state.subjects.find((subject) => subject.id === selectedSubjectId) ?? null;
  }, [state.subjects, selectedSubjectId]);

  // Memoized metrics for the selected subject detail sidebar panel
  const selectedMetrics = useMemo(() => {
    if (!selectedSubject) return null;

    const todayVal = new Date();
    const targetHours = parseFloat(selectedSubject.target_hours) || 0;
    const validHours = parseFloat(selectedSubject.valid_hours) || 0;
    const todayFocus = selectedSubject.completed_today || 0;
    
    const subjectDeadline = selectedSubject.deadline || (state.term ? state.term.endDate : null);
    let todayGoal = 0;
    let isCompleted = validHours >= targetHours;
    let isOverdue = false;

    if (subjectDeadline) {
      const subjectDaysLeft = getDaysLeft(todayVal, subjectDeadline);
      if (subjectDaysLeft >= 0) {
        todayGoal = Math.max(0, (targetHours - validHours + todayFocus) / Math.max(1, subjectDaysLeft) + (selectedSubject.carryover || 0));
      } else {
        isOverdue = !isCompleted;
      }
    }

    return {
      progressPct: targetHours > 0 ? Math.min((validHours / targetHours) * 100, 100) : 0,
      todayFocus: formatHoursToMins(todayFocus),
      todayGoal: formatHoursToMins(todayGoal),
      totalTime: formatHoursToMins(validHours),
      pausedToday: formatHoursToMins(selectedSubject.paused_time_today || 0),
      isCompleted,
      isOverdue
    };
  }, [selectedSubject, state.term]);

  const overviewCopy = isTermEnded
    ? 'The term has settled. What remains here is what was sustained.'
    : dailyTargetCompleted > 0
      ? 'Momentum is already in motion today. Keep it steady with one clean session at a time.'
      : 'Start your first session to see more insights';

  return (
    <div id="home-screen" className="dashboard-shell animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <header className="dashboard-header">
        <div>
          <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Make every minute count.</p>
          <h1 className="wordmark">Mintrack</h1>
        </div>

        <div className="header-pill" role="group" aria-label="Dashboard actions">
          <button id="theme-toggle-btn" className="header-icon-button theme-toggle-svg-btn" title="Toggle Light/Dark Mode" onClick={toggleTheme} type="button">
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
          <button id="settings-btn" className="header-icon-button" title="Settings" onClick={() => onOpenModal('settings')} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </header>

      <section className="progress-rail glass-surface">
        <div className="progress-block">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-small text-text-secondary mb-2">Today&apos;s Target</p>
              <p className="text-medium text-text-primary">{isTermEnded ? 'Closed' : formatHoursToMins(dailyTargetRequired)}</p>
            </div>
            <p className="text-small text-accent">{formatHoursToMins(dailyTargetCompleted)} complete</p>
          </div>
          <div className="progress-track">
            <div className="progress-fill" id="daily-progress-fill" style={{ width: `${dailyPct}%` }}></div>
          </div>
        </div>

        <div className="progress-divider"></div>

        <div className="progress-block">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-small text-text-secondary mb-2">Term Progress</p>
              <p className="text-medium text-text-primary">{formatHoursToMins(totalValid)} of {totalTarget}h</p>
            </div>
            <p className="text-small text-accent">{termPct.toFixed(0)}%</p>
          </div>
          <div className="progress-track">
            <div className="progress-fill" id="term-progress-fill" style={{ width: `${termPct}%` }}></div>
          </div>
        </div>
      </section>

      <main className="dashboard-grid">
        <section className="dashboard-left">
          <div className="panel-heading">
            <div>
              <p id="term-status" className="text-display">{isTermEnded ? 'Term ended' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining`}</p>
              <p id="term-dates" className="text-small text-text-secondary term-dates">
                {state.term && `${formatISODateForDisplay(state.term.startDate)} to ${formatISODateForDisplay(state.term.endDate)}`}
              </p>
            </div>
            <div className="mobile-actions-wrapper">
              <button id="manual-log-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('manualLog')}>Log Session</button>
              <button id="add-subject-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('addSubject')}>Add Subject</button>
            </div>
          </div>

          <div className="subject-grid">
            {state.subjects.map((sub) => (
              <SubjectCard
                key={sub.id}
                sub={sub}
                isSelected={selectedSubjectId === sub.id}
                onSelect={setSelectedSubjectId}
                onOpenModal={onOpenModal}
                termEndDate={state.term?.endDate}
              />
            ))}
          </div>
        </section>

        <aside className="dashboard-right glass-surface">
          {selectedSubject && selectedMetrics ? (
            <>
              <section className="detail-section">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-tiny text-text-muted uppercase tracking-[0.22em] mb-5">Selected subject</p>
                    <h2 className="text-display">{selectedSubject.name}</h2>
                    {selectedSubject.deadline && (
                      <p className="text-tiny text-text-muted mt-3 flex items-center gap-3">
                        Deadline: {formatISODateForDisplay(selectedSubject.deadline)}
                        {selectedMetrics.isOverdue && <span className="px-3 py-1 text-tiny rounded-full bg-[rgba(184,109,96,0.18)] text-[#b86d60] border border-[rgba(184,109,96,0.3)]">Overdue</span>}
                        {selectedMetrics.isCompleted && <span className="px-3 py-1 text-tiny rounded-full bg-[rgba(211,163,108,0.18)] text-[#d3a36c] border border-[rgba(211,163,108,0.3)]">Completed</span>}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="section-divider h-px my-8"></div>

              <section className="detail-section stats-grid">
                <div className="stat-tile">
                  <span className="stat-label">Today&apos;s Focus</span>
                  <strong className="stat-value">{selectedMetrics.todayFocus}</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Today&apos;s Goal</span>
                  <strong className="stat-value">{selectedMetrics.todayGoal}</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Total Time Completed</span>
                  <strong className="stat-value">{selectedMetrics.totalTime}</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Paused Today</span>
                  <strong className="stat-value">{selectedMetrics.pausedToday}</strong>
                </div>
              </section>

            </>
          ) : (
            <section className="detail-empty">
              <p className="text-tiny text-text-muted uppercase tracking-[0.22em] mb-6">Today&apos;s overview</p>
              <h2 className="text-display">{formatHoursToMins(dailyTargetCompleted)}</h2>
              <p className="text-small text-text-secondary mt-3">Focused across the subjects currently in view.</p>
              <p className="text-small text-text-secondary mt-12 max-w-[34ch]">{overviewCopy}</p>
            </section>
          )}
        </aside>
      </main>

      {isTermEnded && (
        <div id="term-ended-banner" className="term-ended-note">
          <h2 className="text-medium text-text-primary">Term ended</h2>
          <p className="text-small text-text-secondary mt-3">No new targets are required now. The dashboard is resting in archive mode.</p>
        </div>
      )}
    </div>
  );
}
