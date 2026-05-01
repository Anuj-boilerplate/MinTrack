import { formatHoursToMins } from '../../utils';

export default function SessionReviewModal({ reviewData, onSave, onDiscard }) {
  if (!reviewData) return null;

  return (
    <div id="session-review-modal" className="modal-backdrop">
      <div className="modal-pane iridescent-border">
        <h2 className="text-medium mb-6 text-text-primary">Session Review</h2>
        <p className="text-text-secondary mb-6">You tracked <span id="review-tracked-time" className="font-bold text-brand-accent">{formatHoursToMins(reviewData.hours)}</span>.</p>
        <p className="text-text-secondary mb-6">How much of this time was productive and should be counted towards your goal?</p>
        
        <div className="flex justify-end gap-6 mt-12 flex-col sm:flex-row">
          <button id="discard-session-btn" className="secondary-btn flex-1" onClick={() => onDiscard(reviewData)}>Discard Completely</button>
          <button id="save-session-btn" className="primary-btn flex-1" onClick={() => onSave(reviewData)}>Count It</button>
        </div>
      </div>
    </div>
  );
}
