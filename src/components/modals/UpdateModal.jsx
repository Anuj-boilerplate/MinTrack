import { APP_VERSION } from '../../config';
import { CHANGELOG } from '../../changelog';
import { motion } from 'framer-motion';

export default function UpdateModal({ onClose }) {
  const latestUpdate = CHANGELOG.find(entry => entry.version === APP_VERSION) || CHANGELOG[0];

  return (
    <motion.div
      id="update-modal"
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane relative"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="modal-heading m-0">What&apos;s New in Mintrack</h2>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-text-primary/10 text-text-primary/70">
              v{latestUpdate.version}
            </span>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-text-primary hover:bg-text-primary/5 transition-colors focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="text-left mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-6">
          {latestUpdate.changes.map((change, index) => (
            <div key={index}>
              <h3 className="modal-label mb-2">{change.title}</h3>
              <p className="font-sans text-[14px] text-text-primary/70 m-0 leading-relaxed">
                {change.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-text-primary/5 flex justify-end">
          <button 
            type="button" 
            id="dismiss-update-btn" 
            className="px-6 py-3 rounded-full text-sm font-medium bg-text-primary/10 text-text-primary hover:bg-text-primary/20 transition-colors border border-text-primary/10"
            onClick={onClose}
          >
            Enter Mintrack
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
