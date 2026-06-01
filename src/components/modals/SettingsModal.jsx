import { useStateContext } from '../../contexts/StateContext';
import { addActionToQueue, processSyncQueue } from '../../lib/syncQueue';

export default function SettingsModal({ onClose }) {
  const { updateState, logout, userId } = useStateContext();

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
    <div id="settings-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border" onClick={e => e.stopPropagation()}>
        <h2 className="text-medium mb-9 text-text-primary">Settings</h2>

        <div className="flex flex-col gap-6">
          <button id="clear-data-btn" className="danger-btn w-full text-left" onClick={handleClearData}>
            Clear All Data
          </button>
          
          <div className="mt-4 pt-4 border-t border-glass">
            <button id="logout-btn" className="secondary-glass-btn w-full justify-start px-8" onClick={logout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-12">
          <button id="close-settings-btn" className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
