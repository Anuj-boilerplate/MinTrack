import { useState } from 'react';
import { formatHoursToMins } from '../../utils';

export default function EditSubjectModal({ subject, onClose, onSave, onDelete }) {
  const [name, setName] = useState(subject?.name || '');
  const [target, setTarget] = useState(subject?.target_hours || subject?.targetHours || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(subject.id, name, parseFloat(target));
  };

  if (!subject) return null;

  return (
    <div id="edit-subject-modal" className="modal-backdrop">
      <div className="modal-pane iridescent-border">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-medium text-text-primary">Edit Subject</h2>
          <button type="button" className="icon-btn hover:bg-brand-danger hover:border-brand-danger hover:text-white" id="delete-subject-btn" title="Delete Subject" onClick={() => onDelete(subject.id)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
          </button>
        </div>
        <form id="edit-subject-form" onSubmit={handleSubmit}>
          <div className="mb-9">
            <label htmlFor="edit-subject-name" className="block text-sm text-text-secondary mb-3">Subject Name</label>
            <input type="text" id="edit-subject-name" className="input-field" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-9">
            <label htmlFor="edit-target-hours" className="block text-sm text-text-secondary mb-3">Total Target Hours</label>
            <input type="number" id="edit-target-hours" className="input-field" min="1" required value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="mb-9">
            <label className="block text-sm text-text-secondary mb-3">Discarded Time</label>
            <div id="edit-discarded-time" className="text-text-secondary opacity-70 text-sm">
              {formatHoursToMins(subject.discarded_time_total || 0)}
            </div>
          </div>
          <div className="flex justify-end gap-6 mt-12">
            <button type="button" className="text-btn" id="cancel-edit-subject-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}
