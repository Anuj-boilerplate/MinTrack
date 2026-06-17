import { useEffect } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { motion } from 'framer-motion';
import { hexToRgba } from '../../utils';

export default function TimerScreen({ timer, onStop }) {
  const { state } = useStateContext();

  const activeSubject = state.subjects.find((subject) => subject.id === state.activeSession?.subjectId);
  const activeTask = state.todos.find((todo) => todo.id === state.activeSession?.taskId);
  const accentColor = activeSubject?.accentColor || '#c97b6e';

  // Subliminal background color shift by phase
  useEffect(() => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const isFocus = timer.phaseInfo.phase === 'Focus Phase';

    let mainBg, secBg;
    if (isFocus) {
      mainBg = isLight ? '#e5ecf0' : '#0a0d14'; // cooler blue-grey paper
      secBg = isLight ? '#d9e3e8' : '#0f121b';
    } else {
      mainBg = isLight ? '#f4ebd0' : '#140c08'; // warmer yellow-tan paper
      secBg = isLight ? '#e9dfc4' : '#1b120c';
    }

    document.documentElement.style.setProperty('--dynamic-bg-main', mainBg);
    document.documentElement.style.setProperty('--dynamic-bg-secondary', secBg);

    return () => {
      document.documentElement.style.removeProperty('--dynamic-bg-main');
      document.documentElement.style.removeProperty('--dynamic-bg-secondary');
    };
  }, [timer.phaseInfo.phase]);

  return (
    <motion.div
      id="timer-screen"
      className="timer-viewport flex flex-col justify-between"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top/Body Area */}
      <div className="flex flex-col w-full text-left items-start">
        {/* Subject Name */}
        <h2 
          id="timer-subject-name" 
          className="font-serif text-[28px] font-normal leading-tight tracking-wide"
          style={{ color: accentColor }}
        >
          {activeSubject?.name || 'Subject Name'}
        </h2>

        {/* Hairline Divider */}
        <div 
          className="h-[1px] w-full mt-4 mb-6" 
          style={{ backgroundColor: hexToRgba(accentColor, 0.5) }} 
        />

        {/* Optional Task Name */}
        {activeTask && (
          <div 
            id="timer-task-name" 
            className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-muted mb-5"
          >
            {activeTask.title}
          </div>
        )}

        {/* Timer Number (Sized as a data point callout) */}
        <div id="timer-display" className="timer-display tabular-nums font-serif font-light text-left leading-none tracking-normal mb-8">
          {timer.displayTime}
        </div>

        {/* Phase & Cycle Metadata */}
        <div className="flex flex-col gap-2">
          <span id="pomo-phase" className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-muted">
            {timer.phaseInfo.phase}
          </span>
          <span id="pomo-cycle" className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-muted">
            {timer.phaseInfo.cycleText}
          </span>
        </div>
      </div>

      {/* CTA Row (Directly matching Goals Card Bottom CTA) */}
      <div className="flex justify-between items-center mt-auto pt-6 border-t border-text-primary/5 w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={timer.isPaused ? timer.resume : timer.pause}
            className="text-[13px] text-text-primary hover:opacity-85 transition-opacity font-sans flex items-center gap-1 cursor-pointer focus:outline-none"
            type="button"
          >
            <span>→ {timer.isPaused ? 'Resume' : 'Pause'}</span>
          </button>
          <span className="text-text-secondary/20 text-xs select-none">•</span>
          <button
            id="stop-timer-btn"
            className="text-[13px] text-text-secondary/60 hover:text-text-primary hover:opacity-100 transition-all font-sans flex items-center gap-1 cursor-pointer focus:outline-none"
            onClick={onStop}
            type="button"
          >
            <span>Stop</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
