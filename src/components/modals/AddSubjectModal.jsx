import { useState } from 'react';

export default function AddSubjectModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(name, parseFloat(target));
  };

  return (
    <div id="add-subject-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-2xl font-semibold mb-4 text-text-primary">Add Subject</h2>
        <form id="subject-form" onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="subject-name" className="block text-sm text-text-secondary mb-2">Subject Name</label>
            <input type="text" id="subject-name" className="input-field" required placeholder="e.g. Calculus" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="mb-6">
            <label htmlFor="target-hours" className="block text-sm text-text-secondary mb-2">Total Target Hours</label>
            <input type="number" id="target-hours" className="input-field" min="1" required placeholder="e.g. 100" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
          <div className="flex justify-end gap-4 mt-8">
            <button type="button" className="text-btn" id="cancel-subject-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}
