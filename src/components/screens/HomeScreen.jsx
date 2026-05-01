import { useEffect, useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, formatHoursToMins, formatISODateForDisplay } from '../../utils';

export default function HomeScreen({ onOpenModal, toggleTheme }) {
  const { state } = useStateContext();
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => state.subjects[0]?.id ?? null);

  useEffect(() => {
    if (!state.subjects.length) {
      setSelectedSubjectId(null);
      return;
    }

    if (!state.subjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(state.subjects[0].id);
    }
  }, [selectedSubjectId, state.subjects]);

  const today = new Date();
  const daysLeft = state.term ? getDaysLeft(today, state.term.endDate) : 0;
  const isTermEnded = daysLeft < 0;

  let totalTarget = 0;
  let totalValid = 0;
  let dailyTargetRequired = 0;
  let dailyTargetCompleted = 0;

  state.subjects.forEach((sub) => {
    const targetHours = parseFloat(sub.target_hours || sub.targetHours) || 0;
    const validHours = parseFloat(sub.valid_hours || sub.validHours) || 0;
    totalTarget += targetHours;
    totalValid += validHours;

    if (daysLeft >= 0) {
      const dailyReq = (targetHours - validHours) / Math.max(1, daysLeft);
      const totalPressure = dailyReq + (sub.carryover || 0);
      dailyTargetRequired += totalPressure;
      dailyTargetCompleted += (sub.completed_today || 0);
    }
  });

  const termPct = Math.min((totalValid / Math.max(1, totalTarget)) * 100, 100) || 0;
  const dailyPct = dailyTargetRequired > 0 ? Math.min((dailyTargetCompleted / dailyTargetRequired) * 100, 100) : 0;
  const selectedSubject = state.subjects.find((subject) => subject.id === selectedSubjectId) ?? null;

  let selectedMetrics = null;
  if (selectedSubject) {
    const targetHours = parseFloat(selectedSubject.target_hours || selectedSubject.targetHours) || 0;
    const validHours = parseFloat(selectedSubject.valid_hours || selectedSubject.validHours) || 0;
    const todayFocus = selectedSubject.completed_today || 0;
    const todayGoal = daysLeft >= 0
      ? Math.max(0, ((targetHours - validHours) / Math.max(1, daysLeft)) + (selectedSubject.carryover || 0))
      : 0;

    selectedMetrics = {
      progressPct: Math.min((validHours / Math.max(1, targetHours)) * 100, 100) || 0,
      streak: todayFocus > 0 ? Math.max(1, Math.round((validHours / Math.max(1, targetHours)) * 7)) : 0,
      totalTime: formatHoursToMins(validHours),
      lastSession: todayFocus > 0 ? 'Today' : 'Quiet today',
      todayGoal: formatHoursToMins(todayGoal),
      rows: [
        ['Today focused', formatHoursToMins(todayFocus)],
        ['Remaining target', formatHoursToMins(Math.max(0, targetHours - validHours))],
        ['Discarded time', formatHoursToMins(selectedSubject.discarded_time_total || 0)],
      ],
    };
  }

  const overviewCopy = isTermEnded
    ? 'The term has settled. What remains here is what was sustained.'
    : dailyTargetCompleted > 0
      ? 'Momentum is already in motion today. Keep it steady with one clean session at a time.'
      : 'The day is still open. One quiet session can change the texture of it.';

  return (
    <div id="home-screen" className="dashboard-shell animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <header className="dashboard-header">
        <div>
          <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Welcome to no nonsense</p>
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
            <div className="flex items-center gap-[18px] flex-wrap justify-end">
              <button id="log-session-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('manualLog')}>Log Session</button>
              <button id="add-subject-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('addSubject')}>Add Subject</button>
            </div>
          </div>

          <div className="subject-grid">
            {state.subjects.map((sub) => {
              const targetHours = parseFloat(sub.target_hours || sub.targetHours) || 0;
              const validHours = parseFloat(sub.valid_hours || sub.validHours) || 0;
              const pct = Math.min((validHours / Math.max(1, targetHours)) * 100, 100) || 0;
              const todayGoal = daysLeft >= 0
                ? Math.max(0, ((targetHours - validHours) / Math.max(1, daysLeft)) + (sub.carryover || 0))
                : 0;
              const statLine = isTermEnded
                ? `${formatHoursToMins(validHours)} completed this term`
                : todayGoal > 0
                  ? `${formatHoursToMins(todayGoal)} left today`
                  : `${formatHoursToMins(sub.completed_today || 0)} focused today`;

              return (
                <article
                  key={sub.id}
                  className={`subject-card glass-surface ${selectedSubjectId === sub.id ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedSubjectId(sub.id)}
                  onFocus={() => setSelectedSubjectId(sub.id)}
                >
                  <div className="flex justify-between items-start gap-4 mb-12">
                    <div className="min-w-0">
                      <button type="button" className="subject-select" onClick={() => setSelectedSubjectId(sub.id)}>
                        <span className="text-medium text-text-primary block truncate">{sub.name}</span>
                      </button>
                      <p className="text-tiny text-text-muted mt-3">{formatHoursToMins(validHours)} of {targetHours}h complete</p>
                    </div>

                    <button
                      className="subject-edit-button"
                      title="Edit Subject"
                      onClick={() => onOpenModal('editSubject', sub.id)}
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
                    <p className="text-small text-text-secondary mt-6">{statLine}</p>
                  </div>

                  <div className="mt-auto pt-12">
                    {daysLeft >= 0 ? (
                      <button className="session-launch-btn w-full" onClick={() => onOpenModal('pomodoro', sub.id)} type="button">
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
            })}
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
                  </div>
                  <p className="text-small text-accent">{selectedMetrics.progressPct.toFixed(0)}% complete</p>
                </div>
              </section>

              <div className="section-divider h-px my-8"></div>

              <section className="detail-section stats-grid">
                <div className="stat-tile">
                  <span className="stat-label">Streak</span>
                  <strong className="stat-value">{selectedMetrics.streak} days</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Total time</span>
                  <strong className="stat-value">{selectedMetrics.totalTime}</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Last session</span>
                  <strong className="stat-value">{selectedMetrics.lastSession}</strong>
                </div>
                <div className="stat-tile">
                  <span className="stat-label">Today&apos;s goal</span>
                  <strong className="stat-value">{selectedMetrics.todayGoal}</strong>
                </div>
              </section>

              <div className="section-divider h-px my-8"></div>

              <section className="detail-section">
                <div className="flex items-center justify-between gap-4 mb-9">
                  <h3 className="text-medium text-text-primary">Weekly heatmap</h3>
                  <p className="text-tiny text-text-muted">Calm consistency</p>
                </div>
                <div className="heatmap-grid" aria-label="Weekly activity heatmap">
                  {Array.from({ length: 7 }).map((_, index) => {
                    const intensity = Math.max(0.14, Math.min(0.94, ((selectedSubject.completed_today || 0) * 0.4) + ((selectedMetrics.progressPct / 100) * (index + 1) / 7)));
                    return (
                      <div key={index} className="heatmap-cell" style={{ '--heat': intensity.toFixed(2) }}>
                        <span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="section-divider h-px my-8"></div>

              <section className="detail-section">
                <div className="flex items-center justify-between gap-4 mb-8">
                  <h3 className="text-medium text-text-primary">Recent metrics</h3>
                  <p className="text-tiny text-text-muted">Current tracked state</p>
                </div>
                <div className="history-table" role="table" aria-label="Subject summary metrics">
                  {selectedMetrics.rows.map(([label, value]) => (
                    <div key={label} className="history-row" role="row">
                      <span className="history-label" role="cell">{label}</span>
                      <span className="history-value" role="cell">{value}</span>
                    </div>
                  ))}
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
