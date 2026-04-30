import { useRef } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { supabase } from '../../lib/supabaseClient';

export default function SettingsModal({ onClose }) {
  const { state, updateState, userId } = useStateContext();
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(state))}`;
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'mintrack_backup.json');
    a.click();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let importedState;
    try {
      importedState = JSON.parse(await file.text());
    } catch {
      alert('Invalid backup file: could not parse JSON.');
      return;
    }

    updateState(importedState);

    if (userId && Array.isArray(importedState.subjects)) {
      await supabase.from('subjects').delete().eq('user_id', userId);
      const inserts = importedState.subjects.map((s) => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        target_hours: s.target_hours ?? s.targetHours ?? 0,
        valid_hours: s.valid_hours ?? s.validHours ?? 0,
      }));
      if (inserts.length) await supabase.from('subjects').insert(inserts);
    }

    if (userId && importedState.term) {
      await supabase.from('profiles').upsert({
        id: userId,
        term_start_date: importedState.term.startDate,
        term_end_date: importedState.term.endDate,
      });
    }

    onClose();
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to completely erase all data? This cannot be undone!')) return;
    if (userId) {
      await supabase.from('subjects').delete().eq('user_id', userId);
      await supabase.from('profiles').update({ term_start_date: null, term_end_date: null }).eq('id', userId);
    }
    updateState({ term: null, subjects: [], activeSession: null, last_updated_date: null });
    onClose();
  };

  return (
    <div id="settings-modal" className="fixed inset-0 bg-background-overlay backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="glass-panel w-full max-w-[400px] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <h2 className="text-2xl font-semibold mb-6 text-text-primary">Settings</h2>

        <div className="flex flex-col gap-4">
          <button id="export-data-btn" className="secondary-btn w-full text-left" onClick={handleExport}>
            Export Backup
          </button>
          <button id="import-data-btn" className="secondary-btn w-full text-left" onClick={handleImportClick}>
            Import Backup
          </button>
          <button id="clear-data-btn" className="danger-btn w-full text-left" onClick={handleClearData}>
            Clear All Data
          </button>
        </div>

        <div className="flex justify-end mt-8">
          <button id="close-settings-btn" className="primary-btn" onClick={onClose}>Done</button>
        </div>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
      </div>
    </div>
  );
}
