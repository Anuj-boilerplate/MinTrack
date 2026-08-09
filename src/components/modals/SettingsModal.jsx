import { useStateContext, useUserContext } from '../../contexts/StateContext';
import { addActionToQueue, processSyncQueue } from '../../lib/syncQueue';
import { useCalendar } from '../../contexts/CalendarContext';
import { motion } from 'framer-motion';

export default function SettingsModal({ onClose }) {
  const { updateState } = useStateContext();
  const { logout, userId } = useUserContext();
  const { isConnected, connectCalendar, disconnectCalendar } = useCalendar();

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to completely erase all data? This cannot be undone!')) return;

    // Clear local state immediately
    updateState({ term: null, subjects: [], activeSession: null, last_updated_date: null });
    onClose();

    // Queue the deletion for Supabase
    if (userId) {
      await addActionToQueue({
        type: 'DELETE_ALL_DATA',
        userId: userId
      });
      processSyncQueue();
    }
  };

  return (
    <motion.div
      id="settings-modal"
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-6">
          <h2 className="modal-heading m-0">Settings</h2>
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

        <div className="flex flex-col gap-6">
          <button
            id="clear-data-btn"
            className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm font-medium bg-[#4a1c1c] text-[#ff8f8f] hover:bg-[#5a2222] transition-colors border border-[#ff8f8f]/20"
            onClick={handleClearData}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2-2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Clear All Data
          </button>

          {/* Google Calendar Connection */}
          <div className="pt-4 border-t border-text-primary/5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-text-secondary/40 mb-3">
              Integrations
            </span>
            <button
              type="button"
              className={`w-full flex items-center justify-center gap-2 px-8 py-3 rounded-full text-sm font-medium transition-colors border ${
                isConnected
                  ? 'bg-[#1a2e1a] text-[#8fff8f] border-[#8fff8f]/20 hover:bg-[#223322]'
                  : 'bg-text-primary/5 text-text-secondary/70 border-text-primary/10 hover:bg-text-primary/10'
              }`}
              onClick={isConnected ? disconnectCalendar : connectCalendar}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {isConnected ? 'Google Calendar Connected ✓' : 'Connect Google Calendar'}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-text-primary/5 flex justify-center">
            <button
              id="logout-btn"
              className="px-6 py-2 rounded-full text-xs font-medium border border-transparent text-text-secondary/50 hover:text-text-primary transition-colors flex items-center gap-2"
              onClick={logout}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
