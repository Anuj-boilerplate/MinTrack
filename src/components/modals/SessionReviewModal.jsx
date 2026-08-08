import { useState } from 'react';
import { formatHoursToMins } from '../../utils';
import { motion } from 'framer-motion';

export default function SessionReviewModal({ reviewData, onSave, onDiscard, onCompleteTask, accentColor = '#c97b6e' }) {
  const hasLinkedTask = Boolean(reviewData?.taskId && reviewData?.taskTitle);
  // Default to checked so the common path (task was the focus of the session) is one click
  const [markComplete, setMarkComplete] = useState(hasLinkedTask);

  if (!reviewData) return null;

  const handleSave = () => {
    // Complete the linked task first — it was the focus of the session being logged
    if (hasLinkedTask && markComplete && onCompleteTask) {
      onCompleteTask(reviewData.taskId, reviewData.taskIsRecurring);
    }
    onSave(reviewData);
  };

  return (
    <motion.div
      id="session-review-modal"
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane text-center"
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="font-serif text-[52px] font-normal text-text-primary/90 leading-none" id="review-tracked-time">
          {formatHoursToMins(reviewData.hours)}
        </div>

        <div className="w-full h-[1px] bg-text-primary/10 my-6" style={{ backgroundColor: `${accentColor}40` }}></div>

        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-text-secondary/40 mt-6" style={{ color: `${accentColor}90` }}>
          Log this time toward your goal?
        </p>

        {/* Task completion toggle — only renders when the session had a linked task */}
        {hasLinkedTask && (
          <motion.button
            type="button"
            aria-pressed={markComplete}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            onClick={() => setMarkComplete(prev => !prev)}
            className="mt-8 w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left"
            style={{
              borderColor: markComplete ? `${accentColor}50` : 'var(--border-glass)',
              backgroundColor: markComplete ? `${accentColor}08` : 'transparent'
            }}
          >
            {/* Checkbox glyph */}
            <span
              aria-hidden="true"
              className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-200"
              style={{
                borderColor: markComplete ? accentColor : 'var(--text-secondary)',
                backgroundColor: markComplete ? accentColor : 'transparent',
                opacity: markComplete ? 1 : 0.3
              }}
            >
              {markComplete && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" focusable="false">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            {/* Task info */}
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-text-primary/80 truncate">
                {reviewData.taskTitle}
              </span>
              <span className="text-[10px] text-text-secondary/60">
                {markComplete ? 'Will mark as complete' : 'Tap to mark as complete'}
              </span>
            </span>
          </motion.button>
        )}

        <div className="flex flex-col gap-3 mt-12 w-full">
          <button
            id="save-session-btn"
            className="px-8 py-3 rounded-full text-sm font-medium transition-colors border w-full"
            style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}
            onClick={handleSave}
          >
            Count It
          </button>
          <button
            id="discard-session-btn"
            className="px-8 py-3 rounded-full text-sm font-medium border border-transparent text-text-secondary/50 hover:text-text-primary transition-colors w-full"
            onClick={() => onDiscard(reviewData)}
          >
            Discard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
