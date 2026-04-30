import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, formatHoursToMins, formatISODateForDisplay } from '../../utils';

export default function HomeScreen({ onOpenModal, toggleTheme }) {
  const { state } = useStateContext();

  const today = new Date();
  const daysLeft = state.term ? getDaysLeft(today, state.term.endDate) : 0;
  const isTermEnded = daysLeft < 0;

  let totalTarget = 0;
  let totalValid = 0;
  let dailyTargetRequired = 0;
  let dailyTargetCompleted = 0;

  state.subjects.forEach((sub) => {
    const tHours = parseFloat(sub.target_hours || sub.targetHours) || 0;
    const vHours = parseFloat(sub.valid_hours || sub.validHours) || 0;
    totalTarget += tHours;
    totalValid += vHours;

    if (daysLeft >= 0) {
      const dailyReq = (tHours - vHours) / Math.max(1, daysLeft);
      const totalPressure = dailyReq + (sub.carryover || 0);
      dailyTargetRequired += totalPressure;
      dailyTargetCompleted += (sub.completed_today || 0);
    }
  });

  const termPct = Math.min((totalValid / Math.max(1, totalTarget)) * 100, 100) || 0;
  const dailyPct = dailyTargetRequired > 0 ? Math.min((dailyTargetCompleted / dailyTargetRequired) * 100, 100) : 0;

  return (
    <div id="home-screen" className="animate-[fadeIn_0.4s_ease-out]">
      <header className="flex flex-col mb-8 pb-4 border-b border-border-glass">
        <div className="flex justify-between items-start w-full">
          <div>
            <h1 id="term-status" className="text-4xl font-bold mb-2 tracking-tight font-heading">
              {isTermEnded ? 'Term Ended' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining`}
            </h1>
            <p id="term-dates" className="text-text-secondary mb-4">
              {state.term && `${formatISODateForDisplay(state.term.startDate)} to ${formatISODateForDisplay(state.term.endDate)}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button id="theme-toggle-btn" className="icon-btn theme-toggle-svg-btn" title="Toggle Light/Dark Mode" onClick={toggleTheme}>
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
            <button id="log-session-btn" className="icon-btn" title="Log Past Session" onClick={() => onOpenModal('manualLog')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button id="add-subject-btn" className="icon-btn" title="Add Subject" onClick={() => onOpenModal('addSubject')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button id="settings-btn" className="icon-btn" title="Settings" onClick={() => onOpenModal('settings')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
        </div>

        {state.subjects.length > 0 && (
          <div className="flex justify-between items-center w-full">
            {!isTermEnded && (
              <div id="daily-progress-container" className="mt-6 w-[250px]">
                <span className="block text-sm text-text-secondary mb-2 font-medium">Today's Target</span>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-background-progress rounded-full overflow-hidden">
                    <div className="h-full bg-brand-accent transition-all duration-300" id="daily-progress-fill" style={{ width: `${dailyPct}%` }}></div>
                  </div>
                  <p className="text-sm font-medium text-brand-accent min-w-[60px] text-right m-0" id="daily-progress-text">
                    {formatHoursToMins(dailyTargetCompleted)} / {formatHoursToMins(dailyTargetRequired)}
                  </p>
                </div>
              </div>
            )}

            <div id="term-progress-container" className={`mt-6 w-[250px] ${isTermEnded ? 'ml-auto' : ''}`}>
              <span className="block text-sm text-text-secondary mb-2 font-medium text-right">Term Progress</span>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-background-progress rounded-full overflow-hidden">
                  <div className="h-full bg-brand-accent transition-all duration-300" id="term-progress-fill" style={{ width: `${termPct}%` }}></div>
                </div>
                <p className="text-sm font-medium text-brand-accent min-w-[60px] text-right m-0" id="term-progress-text">
                  {formatHoursToMins(totalValid)} / {totalTarget}h
                </p>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
          {state.subjects.map((sub) => {
            const tHours = parseFloat(sub.target_hours || sub.targetHours) || 0;
            const vHours = parseFloat(sub.valid_hours || sub.validHours) || 0;
            const pct = Math.min((vHours / Math.max(1, tHours)) * 100, 100) || 0;

            let todayGoalDisplay = 'Term Ended';
            if (daysLeft >= 0) {
              todayGoalDisplay = Math.max(0, (tHours - vHours) / Math.max(1, daysLeft));
            }

            return (
              <div key={sub.id} className="bg-background-glass border border-border-glass rounded-2xl p-6 transition-all duration-200 flex flex-col h-full hover:brightness-110 hover:-translate-y-0.5 hover:shadow-cardHover">
                <div className="flex justify-between items-start mb-4">
                  <div className="text-xl font-semibold text-text-primary font-heading">{sub.name}</div>
                  <button
                    className="bg-transparent border-none text-text-secondary cursor-pointer opacity-50 transition-opacity duration-200 hover:opacity-100 hover:text-brand-accent"
                    title="Edit Subject"
                    onClick={() => onOpenModal('editSubject', sub.id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                  </button>
                </div>

                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-text-secondary">Today's Goal:</span>
                  <span className="font-medium" style={{ color: 'var(--accent)' }}>
                    {typeof todayGoalDisplay === 'number' ? formatHoursToMins(todayGoalDisplay) : todayGoalDisplay}
                  </span>
                </div>

                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-text-secondary">Progress:</span>
                  <span className="font-medium">{formatHoursToMins(vHours)} / {tHours}h</span>
                </div>

                <div className="flex justify-between mb-2 text-sm">
                  <span className="text-text-secondary">Today's Focus:</span>
                  <span className="font-medium">{formatHoursToMins(sub.completed_today || 0)}</span>
                </div>

                <div className="my-4 w-full border-t border-border-glass pt-4">
                  <div className="flex-1 h-2 bg-[var(--progress-bg)] rounded-md overflow-hidden">
                    <div className="h-full bg-brand-accent transition-all duration-300" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-stretch">
                  {daysLeft >= 0 ? (
                    <button className="primary-btn w-full flex items-center justify-center gap-2" onClick={() => onOpenModal('pomodoro', sub.id)}>
                      Start Session
                    </button>
                  ) : (
                    <button className="secondary-btn w-full flex items-center justify-center gap-2" disabled>Finished</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isTermEnded && (
        <div id="term-ended-banner">
          <h2>Term Ended</h2>
          <p>You have reached the end of the term. No new targets are required.</p>
        </div>
      )}
    </div>
  );
}
