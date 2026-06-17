import { formatHoursToMins } from '../../utils';
import { motion } from 'framer-motion';

export default function SessionReviewModal({ reviewData, onSave, onDiscard, accentColor = '#c97b6e' }) {
  if (!reviewData) return null;

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

        <div className="flex flex-col gap-3 mt-12 w-full">
          <button
            id="save-session-btn"
            className="px-8 py-3 rounded-full text-sm font-medium transition-colors border w-full"
            style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}
            onClick={() => onSave(reviewData)}
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
