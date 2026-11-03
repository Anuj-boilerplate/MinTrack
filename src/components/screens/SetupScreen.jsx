import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { parseDateAsLocal } from '../../utils';
import DatePicker from '../DatePicker';

export default function SetupScreen() {
  const { saveTerm } = useStateContext();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleStartTerm = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    const newTerm = {
      startDate: parseDateAsLocal(startDate).toISOString(),
      endDate: parseDateAsLocal(endDate).toISOString()
    };

    const saved = await saveTerm(newTerm);
    setIsSaving(false);
    if (!saved) {
      setError('Could not save your term dates. Please check your network and try again.');
    }
  };

  return (
    <div id="setup-screen" className="animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <div className="glass-panel max-w-[580px] mx-auto text-center">
        <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Make every minute count.</p>
        <span className="wordmark block mb-8">Mintrack</span>
        
        <h1 className="text-display mb-3 tracking-tight">Welcome</h1>
        <p className="text-small text-text-secondary mb-12">Let&apos;s set up your academic term to get started.</p>
        
        {error && (
          <div role="alert" className="mb-6 rounded-xl bg-[#4a1c1c] text-[#ffdddd] px-4 py-3 text-sm text-left">
            {error}
          </div>
        )}

        <form id="term-form" onSubmit={handleStartTerm} className="text-left">
          <div className="mb-9">
            <label htmlFor="term-start" className="block text-sm text-text-secondary mb-3">Start Date</label>
            <DatePicker 
              id="term-start" 
              required 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="e.g. 2026-06-01"
            />
          </div>
          <div className="mb-9">
            <label htmlFor="term-end" className="block text-sm text-text-secondary mb-3">End Date</label>
            <DatePicker 
              id="term-end" 
              required 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="e.g. 2026-10-31"
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
