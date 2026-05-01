import { useEffect, useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';

export default function TimerScreen({ timer, onStop }) {
  const { state } = useStateContext();
  const [showResumeOverlay, setShowResumeOverlay] = useState(() => (
    Boolean(state.activeSession && Date.now() - state.activeSession.startTime > 1000)
  ));
  const [now, setNow] = useState(Date.now());

  const activeSubject = state.subjects.find((subject) => subject.id === state.activeSession?.subjectId);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const sessionUi = state.activeSession?.ui;
  const focusMs = (sessionUi?.focusLength || 0) * 60000;
  const breakMs = (sessionUi?.breakLength || 0) * 60000;
  const cycleMs = focusMs + breakMs;
  const totalMs = cycleMs * (sessionUi?.cycles || 0);
  const elapsedMs = state.activeSession ? Math.min(now - state.activeSession.startTime, totalMs || 0) : 0;
  const overallProgress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 0;
  const progressCircumference = 2 * Math.PI * 154;
  const progressOffset = progressCircumference * (1 - overallProgress);

  return (
    <div id="timer-screen" className="timer-viewport animate-[timerEnter_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <div className="timer-background-shift"></div>
      <div className="timer-persistent-strip"></div>

      <div className="timer-content">
        <p id="timer-subject-name" className="timer-subject-label">{activeSubject?.name || 'Subject Name'}</p>

        <div className="timer-ring-wrap">
          <div className="timer-bloom"></div>
          <svg className="timer-ring-svg" viewBox="0 0 360 360" aria-hidden="true">
            <circle className="timer-ring-track" cx="180" cy="180" r="154"></circle>
            <circle
              className="timer-ring-progress"
              cx="180"
              cy="180"
              r="154"
              strokeDasharray={progressCircumference}
              strokeDashoffset={progressOffset}
            ></circle>
          </svg>
          <div className="timer-rotating-ring"></div>
          <div className="timer-digits-wrap">
            <div id="timer-display" className="timer-display tabular-nums">
              {timer.displayTime}
            </div>
          </div>
        </div>

        <div className="timer-meta">
          <span id="pomo-phase" className="timer-phase-pill">{timer.phaseInfo.phase}</span>
          <span id="pomo-cycle" className="timer-cycle-label">{timer.phaseInfo.cycleText}</span>
        </div>

        <div className="timer-progress">
          <span className="text-tiny text-text-muted uppercase tracking-[0.24em]">Today&apos;s progress</span>
          <div className="progress-track mt-6">
            <div className="progress-fill" id="timer-daily-fill" style={{ width: `${timer.dailyProgressPct}%` }}></div>
          </div>
        </div>

        {showResumeOverlay && (
          <div id="resume-overlay" className="timer-resume-overlay glass-surface">
            <p className="text-small text-text-secondary mb-5">You stepped away while the session kept flowing.</p>
            <p className="text-small text-text-secondary mb-9">Time continued to be tracked precisely in the background.</p>
            <button id="resume-btn" className="primary-btn" onClick={() => setShowResumeOverlay(false)} type="button">
              Return to the ritual
            </button>
          </div>
        )}

        <div className="timer-live-row">
          <span className="live-dot"></span>
          <p id="timer-status" className="text-small text-text-secondary">Live tracking is active</p>
        </div>

        <div className="timer-actions">
          <button className="secondary-glass-btn px-8" type="button">Pause</button>
          <button id="stop-timer-btn" className="secondary-glass-btn px-8" onClick={onStop} type="button">
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}
