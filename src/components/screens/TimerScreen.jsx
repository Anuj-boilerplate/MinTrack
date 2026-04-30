import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';

export default function TimerScreen({ timer, onStop }) {
  const { state } = useStateContext();
  const [showResumeOverlay, setShowResumeOverlay] = useState(() => (
    Boolean(state.activeSession && Date.now() - state.activeSession.startTime > 1000)
  ));

  const activeSubject = state.subjects.find(s => s.id === state.activeSession?.subjectId);

  return (
    <div id="timer-screen" className="animate-[fadeIn_0.4s_ease-out]">
      <div className="h-[70vh] flex flex-col items-center justify-center text-center">
        <h2 id="timer-subject-name" className="text-2xl font-semibold text-text-primary mb-4 font-heading">{activeSubject?.name || 'Subject Name'}</h2>

        <div className="flex gap-4 items-center justify-center mb-[-1rem]">
          <span id="pomo-phase" className={`py-1 px-3 rounded-full text-sm font-semibold ${
            timer.phaseInfo.phaseClass === 'focus-tag' ? 'bg-[rgba(201,122,90,0.15)] text-brand-accent' :
            timer.phaseInfo.phaseClass === 'break-tag' ? 'bg-[rgba(16,185,129,0.2)] text-brand-success' :
            'bg-[rgba(239,68,68,0.2)] text-brand-danger'
          }`}>
            {timer.phaseInfo.phase}
          </span>
          <span id="pomo-cycle" className="text-sm text-text-secondary">
            {timer.phaseInfo.cycleText}
          </span>
        </div>

        <div className="mt-8 w-4/5 max-w-[300px] text-left">
          <span className="block text-sm text-text-secondary mb-2">Today's Progress</span>
          <div className="flex-1 h-3 bg-background-progress rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-accent transition-all duration-300" 
              id="timer-daily-fill"
              style={{ 
                width: `${timer.dailyProgressPct}%`,
                background: timer.dailyProgressPct >= 100 ? 'var(--success)' : 'var(--accent)'
              }}
            ></div>
          </div>
        </div>

        <div id="timer-display" className="text-[5rem] font-bold tracking-tight my-8 drop-shadow-btn tabular-nums">
          {timer.displayTime}
        </div>

        {/* Resume Overlay */}
        {showResumeOverlay && (
          <div id="resume-overlay" className="absolute inset-0 bg-background-glass flex flex-col justify-center items-center z-20">
            <p className="text-text-secondary mb-4">You stepped away while the session was active.</p>
            <p className="text-text-secondary mb-4">The system continued tracking time purely mathematically.</p>
            <button 
              id="resume-btn" 
              className="primary-btn"
              onClick={() => setShowResumeOverlay(false)}
            >
              Resume Timer UI
            </button>
          </div>
        )}

        <p id="timer-status" className="text-text-secondary mb-4">Real absolute time is being tracked.</p>
        <div className="mt-8">
          <button 
            id="stop-timer-btn" 
            className="danger-btn large-btn"
            onClick={onStop}
          >
            Stop Focus Session
          </button>
        </div>
      </div>
    </div>
  );
}
