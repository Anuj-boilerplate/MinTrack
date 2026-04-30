import { formatHoursToMins } from '../../utils';

export default function SessionReviewModal({ reviewData, onSave, onDiscard }) {
  if (!reviewData) return null;

  return (
    <div id="session-review-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Session Review</h2>
        <p className="text-text-secondary mb-4">You tracked <span id="review-tracked-time" className="font-bold text-brand-accent">{formatHoursToMins(reviewData.hours)}</span>.</p>
        <p className="text-text-secondary mb-4">How much of this time was productive and should be counted towards your goal?</p>
        
        <div className="flex justify-end gap-4 mt-8 flex-col sm:flex-row">
          <button id="discard-session-btn" className="secondary-btn flex-1" onClick={() => onDiscard(reviewData)}>Discard Completely</button>
          <button id="save-session-btn" className="primary-btn flex-1" onClick={() => onSave(reviewData)}>Count It</button>
        </div>
      </div>
    </div>
  );
}
