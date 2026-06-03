import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { addActionToQueue, processSyncQueue } from '../../lib/syncQueue';
import DatePicker from '../DatePicker';

export default function SetupScreen() {
  const { updateState, userId } = useStateContext();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleStartTerm = async (e) => {
    e.preventDefault();
    const newTerm = {
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString()
    };
    
    updateState({ term: newTerm });

    // Sync to Supabase via Queue
    if (userId) {
      await addActionToQueue({
        type: 'UPDATE_PROFILE',
        userId: userId,
        payload: {
          term_start_date: newTerm.startDate,
          term_end_date: newTerm.endDate
        }
      });
      processSyncQueue();
    }
  };

  return (
    <div id="setup-screen" className="animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <div className="glass-panel max-w-[580px] mx-auto text-center">
        <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Make every minute count.</p>
        <span className="wordmark block mb-8">Mintrack</span>
        
        <h1 className="text-display mb-3 tracking-tight">Welcome</h1>
        <p className="text-small text-text-secondary mb-12">Let&apos;s set up your academic term to get started.</p>
        
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
          <button type="submit" className="primary-btn w-full">Start Term</button>
        </form>
      </div>
    </div>
  );
}
