import { APP_VERSION } from '../../config';
import { CHANGELOG } from '../../changelog';

export default function UpdateModal({ onClose }) {
  const latestUpdate = CHANGELOG.find(entry => entry.version === APP_VERSION) || CHANGELOG[0];

  return (
    <div id="update-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border relative" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          id="close-update-btn"
          className="icon-btn absolute top-8 right-8 w-8 h-8 border-none"
          title="Close"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <h2 className="text-medium mb-3 text-brand-accent">What&apos;s New in Mintrack</h2>
        <p className="text-small mb-9 text-text-primary">Version {latestUpdate.version}</p>

        <div className="text-left mb-12 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {latestUpdate.changes.map((change, index) => (
            <div key={index} className="mb-6">
              <h3 className="text-small font-semibold mb-2">{change.title}</h3>
              <p className="text-small text-text-secondary m-0">
                {change.description}
              </p>
            </div>
          ))}
        </div>

        <button type="button" id="dismiss-update-btn" className="primary-btn w-full" onClick={onClose}>
          Enter Mintrack
        </button>
      </div>
    </div>
  );
}
