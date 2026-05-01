import { useState } from 'react';

export default function AddSubjectModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(name, parseFloat(target));
  };

  return (
    <div id="add-subject-modal" className="modal-backdrop">
      <div className="modal-pane iridescent-border">
        <h2 className="text-medium mb-6 text-text-primary">Add Subject</h2>
        <form id="subject-form" onSubmit={handleSubmit}>
          <div className="mb-9">
            <label htmlFor="subject-name" className="block text-sm text-text-secondary mb-3">Subject Name</label>
            <input type="text" id="subject-name" className="input-field" required placeholder="e.g. Calculus" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="mb-9">
            <label htmlFor="target-hours" className="block text-sm text-text-secondary mb-3">Total Target Hours</label>
            <input type="number" id="target-hours" className="input-field" min="1" required placeholder="e.g. 100" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="flex justify-end gap-6 mt-12">
            <button type="button" className="text-btn" id="cancel-subject-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
