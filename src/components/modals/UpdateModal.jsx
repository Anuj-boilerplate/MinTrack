export default function UpdateModal({ onClose }) {
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
        <p className="text-small mb-9 text-text-primary">Version 1.4</p>

        <div className="text-left mb-12">
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Removal of fuckass 15 minute logic</h3>
            <p className="text-small text-text-secondary m-0">
              I don't even know why I'd ever even add that. The more I begin thinking from a consumer's perspective the more a realize that it's just an app forcing behaviour on you and that my friends is NOT okay 💔
            </p>
          </div>
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Pause Button Works Now</h3>
            <p className="text-small text-text-secondary m-0">
              Don't even know why it didn't up until now LMAO I must've forgotten.
            </p>
          </div>
          <div className="mb-6">
            <h3 className="text-small font-semibold mb-2">Changed Modal Dimensions</h3>
            <p className="text-small text-text-secondary m-0">
              Now they are THICC like me haha (I'm kidding, I ain't allat)
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
