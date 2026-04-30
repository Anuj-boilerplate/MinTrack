import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { supabase } from '../../lib/supabaseClient';

export default function SetupScreen() {
  const { updateState } = useStateContext();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleStartTerm = async (e) => {
    e.preventDefault();
    const newTerm = {
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString()
    };
    
    updateState({ term: newTerm });

    // Sync to Supabase if logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      await supabase.from('profiles').upsert({
        id: session.user.id,
        term_start_date: newTerm.startDate,
        term_end_date: newTerm.endDate
      });
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedState = JSON.parse(event.target.result);
        if (importedState.term && importedState.subjects) {
          updateState(importedState);
        } else {
          alert('Invalid backup file format.');
        }
      } catch {
        alert('Failed to parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="setup-screen" className="animate-[fadeIn_0.4s_ease-out]">
      <div className="glass-panel max-w-[400px] mx-auto text-center">
        <h1 className="text-4xl font-bold mb-2 tracking-tight">Welcome to MinTrack</h1>
        <p className="text-text-secondary mb-4">Let's set up your academic term.</p>
        <form id="term-form" onSubmit={handleStartTerm} className="text-left">
          <div className="mb-6">
            <label htmlFor="term-start" className="block text-sm text-text-secondary mb-2">Start Date</label>
            <input 
              type="date" 
              id="term-start" 
              className="input-field"
              required 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="term-end" className="block text-sm text-text-secondary mb-2">End Date</label>
            <input 
              type="date" 
              id="term-end" 
              className="input-field"
              required 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button type="submit" className="primary-btn w-full">Start Term</button>
        </form>

        <div className="mt-8 pt-6 border-t border-border-glass">
          <p className="text-text-secondary mb-4">Or import existing data:</p>
          <input 
            type="file" 
            id="import-file" 
            accept=".json" 
            className="hidden" 
            onChange={handleImport}
          />
          <label htmlFor="import-file" className="secondary-btn">Import Backup</label>
        </div>
      </div>
    </div>
  );
}
