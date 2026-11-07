import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import DatePicker from '../DatePicker';

export default function SetupScreen() {
  const { createTerm } = useStateContext();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleStartTerm = async (e) => {
    e.preventDefault();
    setError(null);
    if (endDate < startDate) {
      setError('The end date must be on or after the start date.');
      return;
    }
    setIsSaving(true);
    const result = await createTerm(name, startDate, endDate);
    setIsSaving(false);
    if (!result?.ok) setError(result?.error || 'Could not create your term. Please try again.');
  };

  return (
    <div id="setup-screen">
      <div className="glass-panel max-w-[580px] mx-auto text-center">
        <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Make every minute count.</p>
        <span className="wordmark block mb-8">Mintrack</span>
        
        <h1 className="text-display mb-3 tracking-tight">Welcome</h1>
        <p className="text-small text-text-secondary mb-12">Create your first term. You can add and switch between terms later.</p>
        
        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-[#4a1c1c] text-[#ffdddd] px-4 py-3 text-sm text-left">
            {error}
          </div>
        )}

        <form id="term-form" onSubmit={handleStartTerm} className="text-left">
          <div className="mb-9">
            <label htmlFor="term-name" className="block text-sm text-text-secondary mb-3">Term Name</label>
            <input id="term-name" className="input-field" required maxLength={80} value={name}
              onChange={e => setName(e.target.value)} placeholder="e.g. Fall 2026" />
          </div>
          <div className="mb-9">
            <label htmlFor="term-start" className="block text-sm text-text-secondary mb-3">Start Date</label>
            <DatePicker
              id="term-start"
              required 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Select a start date"
            />
          </div>
          <div className="mb-9">
            <label htmlFor="term-end" className="block text-sm text-text-secondary mb-3">End Date</label>
            <DatePicker
              id="term-end"
              required 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Select an end date"
            />
          </div>
          <button type="submit" className="primary-btn w-full" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Start Term'}
          </button>
        </form>
      </div>
    </div>
  );
}
