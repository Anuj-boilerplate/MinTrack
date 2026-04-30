export default function UpdateModal({ onClose }) {
  return (
    <div id="update-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] relative animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <button
          type="button"
          id="close-update-btn"
          className="icon-btn absolute top-4 right-4 w-8 h-8 border-none"
          title="Close"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
        <h2 className="text-2xl font-semibold mb-2 text-brand-accent">What's New in MinTrack</h2>
        <p className="text-sm mb-6 text-text-primary">Version 1.2</p>

        <div className="text-left mb-8">
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">Unified React App</h3>
            <p className="text-sm text-text-secondary m-0">
              The timer, state model, and session review flow now run through a single React architecture with no split between old and new app paths.
            </p>
          </div>
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">Cleaner Session Logging</h3>
            <p className="text-sm text-text-secondary m-0">
              Manual logs and completed timer sessions now preserve meaningful timestamps, making sync data much more trustworthy.
            </p>
          </div>
          <div className="mb-4">
            <h3 className="text-base font-semibold mb-1">Migration Cleanup</h3>
            <p className="text-sm text-text-secondary m-0">
              Legacy migration artifacts and broken UI text have been cleaned up so the current app is easier to maintain and safer to extend.
            </p>
          </div>
        </div>

        <button type="button" id="dismiss-update-btn" className="primary-btn w-full" onClick={onClose}>
          Awesome, let's go!
        </button>
      </div>
    </div>
  );
}
