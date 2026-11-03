import { useEffect, useRef, useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { formatHoursToMins, getDaysLeft, getStartOfDay } from '../../utils';

function getDeadlineLabel(goal) {
  if (!goal.deadline) return 'No deadline set';
  const days = getDaysLeft(getStartOfDay(), goal.deadline);
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

export default function HomeScreen({ onOpenScreen }) {
  const { state } = useStateContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const selectorRef = useRef(null);
  const goals = state.subjects;
  const currentIndex = Math.min(activeIndex, Math.max(0, goals.length - 1));
  const goal = goals[currentIndex];
  const goalProgress = goal?.target_hours > 0
    ? Math.round(Math.min(100, (goal.valid_hours / goal.target_hours) * 100))
    : 0;

  useEffect(() => {
    selectorRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [currentIndex]);

  const selectGoal = index => setActiveIndex(Math.max(0, Math.min(goals.length - 1, index)));
  const handleCarouselKeyDown = event => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectGoal(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectGoal(currentIndex + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectGoal(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectGoal(goals.length - 1);
    }
  };

  const isTermEnded = state.term ? getDaysLeft(getStartOfDay(), state.term.endDate) < 0 : false;

  return (
    <section id="home-screen" className="page-content goals-focus-page">
      <div className="page-heading-row goals-page-heading">
        <div>
          <p className="eyebrow">{state.term?.name || 'Current term'}</p>
          <h1 className="page-title">Goals</h1>
          <p className="page-description">A clear view of your progress, one goal at a time.</p>
        </div>
        <button type="button" className="primary-action goals-add-button" onClick={() => onOpenScreen('addSubject')}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add goal
        </button>
      </div>

      {!goals.length ? (
        <div className="empty-state goals-empty-state">
          <h2>Start with a goal</h2>
          <p>Add a study target for this term to see your progress here.</p>
          <button type="button" className="primary-action" onClick={() => onOpenScreen('addSubject')}>Create your first goal</button>
        </div>
      ) : (
        <div className="goal-carousel" role="region" aria-roledescription="carousel" aria-label="Goal carousel" tabIndex={0} onKeyDown={handleCarouselKeyDown}>
          <div className="goal-carousel-toolbar">
            <div className="goal-carousel-position" aria-live="polite">
              <span className="goal-carousel-kicker">IN FOCUS</span>
            <span className="goal-carousel-count">{currentIndex + 1}<span> / {goals.length}</span></span>
            </div>
            <div className="goal-carousel-controls">
              <span className="goal-carousel-hint">Use arrow keys or choose a goal below</span>
              <button type="button" className="goal-carousel-arrow" aria-label="Previous goal" disabled={currentIndex === 0} onClick={() => selectGoal(currentIndex - 1)}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button type="button" className="goal-carousel-arrow" aria-label="Next goal" disabled={currentIndex === goals.length - 1} onClick={() => selectGoal(currentIndex + 1)}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>

          <article
            key={goal.id}
            className="goal-focus-card"
            style={{ '--goal-accent': goal.accentColor || '#7652ed' }}
          >
            <div className="goal-focus-header">
              <div className="goal-focus-title-group">
                <span className="goal-focus-overline"><span className="goal-focus-color-dot" /> Selected goal</span>
                <h2 className="goal-focus-title">{goal.name}</h2>
                <span className="goal-deadline-label">{getDeadlineLabel(goal)}</span>
              </div>
              <button type="button" className="secondary-action goal-edit-action" onClick={() => onOpenScreen('editGoal', goal.id)}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                Edit goal
              </button>
            </div>

            <div className="goal-focus-progress-layout">
              <div className="goal-focus-progress-copy">
                <div className="goal-progress-heading"><span className="goal-section-label">STUDY PROGRESS</span><span className="goal-progress-percentage">{goalProgress}%</span></div>
                <p className="goal-focus-hours">{formatHoursToMins(goal.valid_hours || 0)}<span> / {formatHoursToMins(goal.target_hours || 0)}</span></p>
                <div className="goal-progress-track" role="progressbar" aria-label={`${goal.name} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={goalProgress}>
                  <span style={{ width: `${goalProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="goal-focus-stats">
              <div className="goal-focus-stat"><span>Today</span><strong>{formatHoursToMins(goal.completed_today || 0)}</strong></div>
              <div className="goal-focus-stat"><span>Daily pace</span><strong>{formatHoursToMins(goal.daily_target || 0)}</strong></div>
            </div>

            <div className="goal-focus-actions">
              <button type="button" className="primary-action" onClick={() => onOpenScreen('pomodoro', goal.id)}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
                Start Pomodoro timer
              </button>
              <button type="button" className="quiet-button" onClick={() => onOpenScreen('logSession', goal.id)}>Log study time</button>
            </div>
          </article>

          <div className="goal-selector-heading">
            <div><h2>Your goals</h2><span>Select one to bring it into focus</span></div>
            <span className="goal-selector-shortcut">{goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
          </div>
          <div className="goal-selector-strip" ref={selectorRef} role="group" aria-label="Choose a goal">
            {goals.map((item, index) => {
              const percentage = item.target_hours > 0 ? Math.round(Math.min(100, (item.valid_hours / item.target_hours) * 100)) : 0;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`goal-selector-item${index === currentIndex ? ' is-selected' : ''}`}
                  aria-pressed={index === currentIndex}
                  aria-label={`${item.name}, ${percentage}% complete`}
                  onClick={() => selectGoal(index)}
                  style={{ '--goal-accent': item.accentColor || '#7652ed' }}
                >
                  <span className="goal-selector-dot" />
                  <span className="goal-selector-copy"><strong>{item.name}</strong><small>{percentage}% complete</small></span>
                  <span className="goal-selector-mini-track"><i style={{ width: `${percentage}%` }} /></span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isTermEnded && <div id="term-ended-banner" className="term-ended-note"><h2 className="text-medium text-text-primary">Term ended</h2><p className="text-small text-text-secondary mt-3">No new targets are required now. The dashboard is resting in archive mode.</p></div>}
    </section>
  );
}
