import { useState } from 'react';
import { useStateContext, useUserContext } from '../../contexts/StateContext';

export default function SettingsScreen() {
  const { theme, setTheme, clearAllData, smartTaskInput, toggleSmartTaskInput } = useStateContext();
  const { logout } = useUserContext();
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    await clearAllData();
    setIsClearing(false);
    setConfirmClear(false);
  };

  return (
    <section className="page-content narrow-page">
      <div className="page-heading-row"><div><p className="eyebrow">Account</p><h1 className="page-title">Settings</h1><p className="page-description">Tune MinTrack to fit the way you study.</p></div></div>
      <div className="settings-sections">
        <section className="settings-group"><h2 className="section-title">Appearance</h2><div className="settings-row"><div><h3>Color theme</h3><p>Choose a comfortable workspace appearance.</p></div><div className="segmented-toggle" role="group" aria-label="Color theme"><button type="button" className={theme === 'light' ? 'selected' : ''} aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button><button type="button" className={theme === 'dark' ? 'selected' : ''} aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button></div></div></section>

        <section className="settings-group"><h2 className="section-title">Task entry</h2><div className="settings-row"><div><h3>Smart date recognition</h3><p>Recognize dates and repeat days as you type a task.</p></div><button type="button" role="switch" aria-label="Smart date recognition" aria-checked={smartTaskInput} className={`switch-control${smartTaskInput ? ' is-on' : ''}`} onClick={toggleSmartTaskInput}><span /></button></div></section>

        <section className="settings-group settings-danger"><h2 className="section-title">Data and account</h2>{confirmClear ? <div className="confirm-inline" role="group" aria-label="Confirm data deletion"><p>This permanently deletes all terms, goals, tasks, and study sessions.</p><div className="form-actions"><button type="button" className="quiet-button" onClick={() => setConfirmClear(false)}>Keep my data</button><button type="button" className="danger-action" disabled={isClearing} onClick={handleClear}>{isClearing ? 'Deleting…' : 'Delete all data'}</button></div></div> : <button type="button" className="danger-action" onClick={() => setConfirmClear(true)}>Clear all study data</button>}</section>
        <button type="button" className="quiet-button logout-action" onClick={logout}>Sign out</button>
      </div>
    </section>
  );
}
