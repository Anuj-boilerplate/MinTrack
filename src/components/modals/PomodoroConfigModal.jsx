import { useState, useEffect, useRef } from 'react';

export default function PomodoroConfigModal({ onClose, onStart }) {
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [view, setView] = useState('presets'); // 'presets' or 'custom'
  
  // Custom saved preset states
  const [customFocus, setCustomFocus] = useState(null);
  const [customBreak, setCustomBreak] = useState(null);
  const [customCycles, setCustomCycles] = useState(null);

  // Unrestricted string states for typable textboxes
  const [focusInput, setFocusInput] = useState('25');
  const [breakInput, setBreakInput] = useState('5');
  const [cyclesInput, setCyclesInput] = useState('4');

  // Holding timers for stepper auto-repeat
  const repeatTimeoutRef = useRef(null);
  const repeatIntervalRef = useRef(null);

  // Viewport and Pane Refs for dynamic height tracking
  const presetsPaneRef = useRef(null);
  const customPaneRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(350);

  // Synchronize input states when selected preset changes
  useEffect(() => {
    if (selectedPreset === 'standard') {
      setFocusInput('25');
      setBreakInput('5');
      setCyclesInput('4');
    } else if (selectedPreset === 'deep') {
      setFocusInput('50');
      setBreakInput('10');
      setCyclesInput('4');
    } else if (selectedPreset === 'ultradian') {
      setFocusInput('90');
      setBreakInput('20');
      setCyclesInput('2'); // Standard Ultradian uses 2 longer sessions
    } else if (selectedPreset === 'custom') {
      if (customFocus !== null) {
        setFocusInput(String(customFocus));
        setBreakInput(String(customBreak));
        setCyclesInput(String(customCycles));
      } else {
        setFocusInput('25');
        setBreakInput('5');
        setCyclesInput('4');
      }
    }
  }, [selectedPreset, customFocus, customBreak, customCycles]);

  // Seamless, dynamic height tracking using ResizeObserver to prevent any clipping on any screens
  useEffect(() => {
    const activeRef = view === 'presets' ? presetsPaneRef : customPaneRef;
    if (activeRef.current) {
      const handleResize = () => {
        setViewportHeight(activeRef.current.offsetHeight || activeRef.current.scrollHeight);
      };
      
      handleResize();

      const observer = new ResizeObserver(handleResize);
      observer.observe(activeRef.current);
      return () => observer.disconnect();
    }
  }, [view, selectedPreset, customFocus, customBreak, customCycles, focusInput, breakInput, cyclesInput]);

  // Adjust values with safe minimum boundary of 1
  const adjustValue = (amount, field) => {
    if (field === 'focus') {
      setFocusInput((prev) => String(Math.max(1, (parseInt(prev) || 1) + amount)));
    } else if (field === 'break') {
      setBreakInput((prev) => String(Math.max(1, (parseInt(prev) || 1) + amount)));
    } else if (field === 'cycles') {
      setCyclesInput((prev) => String(Math.max(1, (parseInt(prev) || 1) + amount)));
    }
  };

  // Auto-repeat triggers on long-press
  const startRepeat = (amount, field) => {
    stopRepeat();
    adjustValue(amount, field);
    repeatTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => {
        adjustValue(amount, field);
      }, 85);
    }, 380);
  };

  const stopRepeat = () => {
    if (repeatTimeoutRef.current) clearTimeout(repeatTimeoutRef.current);
    if (repeatIntervalRef.current) clearInterval(repeatIntervalRef.current);
  };

  // Safe sanitization on input blur
  const handleBlur = (field) => {
    if (field === 'focus') {
      setFocusInput((prev) => prev === '' ? '1' : String(Math.max(1, parseInt(prev) || 1)));
    } else if (field === 'break') {
      setBreakInput((prev) => prev === '' ? '1' : String(Math.max(1, parseInt(prev) || 1)));
    } else if (field === 'cycles') {
      setCyclesInput((prev) => prev === '' ? '1' : String(Math.max(1, parseInt(prev) || 1)));
    }
  };

  // Submits the active preset configuration
  const handleStartSession = () => {
    const focusLength = Math.max(1, parseInt(focusInput) || 25);
    const breakLength = Math.max(1, parseInt(breakInput) || 5);
    const cycles = Math.max(1, parseInt(cyclesInput) || 4);
    onStart({ focusLength, breakLength, cycles });
  };

  // Saves custom timer parameters and returns to presets list
  const handleSaveCustom = (e) => {
    e.preventDefault();
    const focus = Math.max(1, parseInt(focusInput) || 25);
    const breakTime = Math.max(1, parseInt(breakInput) || 5);
    const cyc = Math.max(1, parseInt(cyclesInput) || 4);
    
    setCustomFocus(focus);
    setCustomBreak(breakTime);
    setCustomCycles(cyc);
    setSelectedPreset('custom');
    setView('presets');
  };

  const handleSelectCustomCard = () => {
    setSelectedPreset('custom');
    setView('custom');
  };

  const handleBackToPresets = () => {
    setView('presets');
    // If no custom settings were ever saved, default selected back to standard
    if (customFocus === null) {
      setTimeout(() => {
        setSelectedPreset('standard');
      }, 250);
    }
  };

  // Cleanup repeat timers on unmount
  useEffect(() => {
    return () => stopRepeat();
  }, []);

  return (
    <div id="pomodoro-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border" onClick={e => e.stopPropagation()}>
        <div className="modal-slider-viewport" style={{ height: `${viewportHeight}px` }}>
          
          {/* Preset Picker View */}
          <div ref={presetsPaneRef} className={`modal-slide-pane ${view === 'presets' ? 'active-left' : 'inactive-left'}`}>
            <h2 className="text-medium mb-6 text-text-primary">Configure Session</h2>
            
            <div className="radio-cards-grid">
              <button
                type="button"
                className={`radio-card ${selectedPreset === 'standard' ? 'selected' : ''}`}
                onClick={() => setSelectedPreset('standard')}
              >
                <span className="radio-card-title">Standard</span>
                <span className="radio-card-subtitle">25/5 min • 4 sessions</span>
              </button>

              <button
                type="button"
                className={`radio-card ${selectedPreset === 'deep' ? 'selected' : ''}`}
                onClick={() => setSelectedPreset('deep')}
              >
                <span className="radio-card-title">Deep Work</span>
                <span className="radio-card-subtitle">50/10 min • 4 sessions</span>
              </button>

              <button
                type="button"
                className={`radio-card ${selectedPreset === 'ultradian' ? 'selected' : ''}`}
                onClick={() => setSelectedPreset('ultradian')}
              >
                <span className="radio-card-title">Ultradian</span>
                <span className="radio-card-subtitle">90/20 min • 2 sessions</span>
              </button>

              <button
                type="button"
                className={`radio-card ${selectedPreset === 'custom' ? 'selected' : ''}`}
                onClick={handleSelectCustomCard}
              >
                <span className="radio-card-title">Custom</span>
                <span className="radio-card-subtitle">
                  {customFocus !== null 
                    ? `${customFocus}/${customBreak} min • ${customCycles} sessions` 
                    : 'Set custom times'
                  }
                </span>
              </button>
            </div>

            <div className="flex justify-end gap-6 mt-8">
              <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
              <button type="button" className="primary-btn" onClick={handleStartSession}>Start</button>
            </div>
          </div>

          {/* Custom Editor View */}
          <div ref={customPaneRef} className={`modal-slide-pane ${view === 'custom' ? 'active-right' : 'inactive-right'}`}>
            <button type="button" className="modal-back-btn" onClick={handleBackToPresets}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>

            <h2 className="text-medium mb-1 text-text-primary">Pomodoro Settings</h2>
            <p className="text-tiny text-text-muted mb-8">Custom Timer</p>

            <form onSubmit={handleSaveCustom}>
              <div className="stepper-row">
                <span className="stepper-label">Focus duration</span>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(-1, 'focus')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(-1, 'focus')}
                    onTouchEnd={stopRepeat}
                  >−</button>
                  <input
                    type="number"
                    className="stepper-value"
                    value={focusInput}
                    min="1"
                    onChange={(e) => setFocusInput(e.target.value)}
                    onBlur={() => handleBlur('focus')}
                  />
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(1, 'focus')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(1, 'focus')}
                    onTouchEnd={stopRepeat}
                  >+</button>
                </div>
              </div>

              <div className="stepper-row">
                <span className="stepper-label">Break duration</span>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(-1, 'break')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(-1, 'break')}
                    onTouchEnd={stopRepeat}
                  >−</button>
                  <input
                    type="number"
                    className="stepper-value"
                    value={breakInput}
                    min="1"
                    onChange={(e) => setBreakInput(e.target.value)}
                    onBlur={() => handleBlur('break')}
                  />
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(1, 'break')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(1, 'break')}
                    onTouchEnd={stopRepeat}
                  >+</button>
                </div>
              </div>

              <div className="stepper-row">
                <span className="stepper-label">Sessions</span>
                <div className="stepper-control">
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(-1, 'cycles')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(-1, 'cycles')}
                    onTouchEnd={stopRepeat}
                  >−</button>
                  <input
                    type="number"
                    className="stepper-value"
                    value={cyclesInput}
                    min="1"
                    onChange={(e) => setCyclesInput(e.target.value)}
                    onBlur={() => handleBlur('cycles')}
                  />
                  <button
                    type="button"
                    className="stepper-btn select-none"
                    onMouseDown={() => startRepeat(1, 'cycles')}
                    onMouseUp={stopRepeat}
                    onMouseLeave={stopRepeat}
                    onTouchStart={() => startRepeat(1, 'cycles')}
                    onTouchEnd={stopRepeat}
                  >+</button>
                </div>
              </div>

              <p className="text-tiny text-text-secondary text-center mt-6">
                Preview: {cyclesInput === '' ? '1' : cyclesInput} sessions × {focusInput === '' ? '1' : focusInput}m focus / {breakInput === '' ? '1' : breakInput}m break
              </p>

              <div className="flex justify-end gap-6 mt-8">
                <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="primary-btn">Save</button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
