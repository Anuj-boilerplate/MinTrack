export default function UpdateModal({ onClose }) {
  return (
    <div id="update-modal" className="modal-backdrop">
      <div className="modal-pane iridescent-border relative">
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
        <p className="text-small mb-9 text-text-primary">Version 1.3</p>

        <div className="text-left mb-12">
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Pretty</h3>
            <p className="text-small text-text-secondary m-0">
              Glass Shiny Shiny. Color very nice.
            </p>
          </div>
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Pettier Timer</h3>
            <p className="text-small text-text-secondary m-0">
              Haha Circle go BRRRRRR
            </p>
          </div>
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Wowwwww!!!</h3>
            <p className="text-small text-text-secondary m-0">
              I hope you like it :D
            </p>
          </div>
        </div>

        <button type="button" id="dismiss-update-btn" className="primary-btn w-full" onClick={onClose}>
          Enter Mintrack
        </button>
      </div>
    </div>
  );
}
