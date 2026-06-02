import { useState, useCallback, useEffect, useRef, memo } from 'react';

// ---------------------------------------------------------------------------
// StepperRow — memo'd so only the row whose value changed re-renders
// ---------------------------------------------------------------------------
const StepperRow = memo(function StepperRow({ label, value, onChange, onBlur, onAdjust }) {
  const repeatTimeoutRef = useRef(null);
  const repeatIntervalRef = useRef(null);

  const stopRepeat = useCallback(() => {
    clearTimeout(repeatTimeoutRef.current);
    clearInterval(repeatIntervalRef.current);
  }, []);

  const startRepeat = useCallback((amount) => {
    stopRepeat();
    onAdjust(amount);
    repeatTimeoutRef.current = setTimeout(() => {
      repeatIntervalRef.current = setInterval(() => onAdjust(amount), 85);
    }, 380);
  }, [onAdjust, stopRepeat]);

  useEffect(() => stopRepeat, [stopRepeat]);

  return (
    <div className="stepper-row">
      <span className="stepper-label">{label}</span>
      <div className="stepper-control">
        <button
          type="button"
          className="stepper-btn select-none"
          onMouseDown={() => startRepeat(-1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(-1)}
          onTouchEnd={stopRepeat}
        >−</button>
        <input
          type="number"
          className="stepper-value"
          value={value}
          min="1"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="stepper-btn select-none"
          onMouseDown={() => startRepeat(1)}
          onMouseUp={stopRepeat}
          onMouseLeave={stopRepeat}
          onTouchStart={() => startRepeat(1)}
          onTouchEnd={stopRepeat}
        >+</button>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Module-level constants — zero per-render allocation
// ---------------------------------------------------------------------------
const PRESETS = {
  standard: { focus: 25, breakTime: 5,  cycles: 4 },
  deep:     { focus: 50, breakTime: 10, cycles: 4 },
  ultradian:{ focus: 90, breakTime: 20, cycles: 2 },
};

const PRESET_LABELS = {
  standard: 'Standard',
  deep: 'Deep Work',
  ultradian: 'Ultradian',
};

const PRESET_SUBTITLES = {
  standard: '25/5 min • 4 sessions',
  deep: '50/10 min • 4 sessions',
  ultradian: '90/20 min • 2 sessions',
};

const clamp = (raw, fallback = 1) => Math.max(1, parseInt(raw) || fallback);

// ---------------------------------------------------------------------------
// PomodoroConfigModal
// ---------------------------------------------------------------------------
export default function PomodoroConfigModal({ onClose, onStart }) {
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [view, setView] = useState('presets'); // 'presets' | 'custom'
  const [customPreset, setCustomPreset] = useState(null);

  const [focusInput,  setFocusInput]  = useState('25');
  const [breakInput,  setBreakInput]  = useState('5');
  const [cyclesInput, setCyclesInput] = useState('4');

  const presetsPaneRef = useRef(null);
  const customPaneRef  = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(350);

  // Sync inputs when selected preset changes
  useEffect(() => {
    const preset = PRESETS[selectedPreset];
    if (preset) {
      setFocusInput(String(preset.focus));
      setBreakInput(String(preset.breakTime));
      setCyclesInput(String(preset.cycles));
    } else if (selectedPreset === 'custom') {
      const src = customPreset ?? PRESETS.standard;
      setFocusInput(String(src.focus));
      setBreakInput(String(src.breakTime));
      setCyclesInput(String(src.cycles));
    }
  }, [selectedPreset, customPreset]);

  // ResizeObserver — only re-attaches when the visible pane changes
  useEffect(() => {
    const activeRef = view === 'presets' ? presetsPaneRef : customPaneRef;
    if (!activeRef.current) return;

    const measure = () => {
      setViewportHeight(activeRef.current.offsetHeight || activeRef.current.scrollHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(activeRef.current);
    return () => observer.disconnect();
  }, [view]);

  // ---------------------------------------------------------------------------
  // Stable adjust/blur handlers — named per-field, empty deps because
  // useState setters are guaranteed stable references across renders.
  // Replaces the factory pattern so JSX passes the same function reference
  // every render → StepperRow.memo can bail out correctly.
  // ---------------------------------------------------------------------------
  const adjustFocus  = useCallback((d) => setFocusInput( (p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);
  const adjustBreak  = useCallback((d) => setBreakInput( (p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);
  const adjustCycles = useCallback((d) => setCyclesInput((p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);

  const blurFocus  = useCallback(() => setFocusInput( (p) => p === '' ? '1' : String(clamp(p))), []);
  const blurBreak  = useCallback(() => setBreakInput( (p) => p === '' ? '1' : String(clamp(p))), []);
  const blurCycles = useCallback(() => setCyclesInput((p) => p === '' ? '1' : String(clamp(p))), []);

  // ---------------------------------------------------------------------------
  // Event handlers — useCallback so referential identity is stable if ever
  // passed through context or memoized children in the future.
  // ---------------------------------------------------------------------------
  const handleStartSession = useCallback(() => {
    onStart({
      focusLength: clamp(focusInput, 25),
      breakLength: clamp(breakInput, 5),
      cycles:      clamp(cyclesInput, 4),
    });
  }, [onStart, focusInput, breakInput, cyclesInput]);

  const handleSaveCustom = useCallback((e) => {
    e.preventDefault();
    setCustomPreset({
      focus:     clamp(focusInput, 25),
      breakTime: clamp(breakInput, 5),
      cycles:    clamp(cyclesInput, 4),
    });
    setSelectedPreset('custom');
    setView('presets');
  }, [focusInput, breakInput, cyclesInput]);

  const handleSelectCustomCard = useCallback(() => {
    setSelectedPreset('custom');
    setView('custom');
  }, []);

  const handleBackToPresets = useCallback(() => {
    setView('presets');
    if (customPreset === null) {
      setTimeout(() => setSelectedPreset('standard'), 250);
    }
  }, [customPreset]);

  return (
    <div id="pomodoro-modal" className="modal-backdrop" onClick={onClose}>
      <div className="modal-pane iridescent-border" onClick={e => e.stopPropagation()}>
        <div className="modal-slider-viewport" style={{ height: `${viewportHeight}px` }}>

          {/* ── Preset Picker View ── */}
          <div ref={presetsPaneRef} className={`modal-slide-pane ${view === 'presets' ? 'active-left' : 'inactive-left'}`}>
            <h2 className="text-medium mb-6 text-text-primary">Configure Session</h2>

            <div className="radio-cards-grid">
              {['standard', 'deep', 'ultradian'].map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`radio-card ${selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => setSelectedPreset(key)}
                >
                  <span className="radio-card-title">{PRESET_LABELS[key]}</span>
                  <span className="radio-card-subtitle">{PRESET_SUBTITLES[key]}</span>
                </button>
              ))}

              <button
                type="button"
                className={`radio-card ${selectedPreset === 'custom' ? 'selected' : ''}`}
                onClick={handleSelectCustomCard}
              >
                <span className="radio-card-title">Custom</span>
                <span className="radio-card-subtitle">
                  {customPreset !== null
                    ? `${customPreset.focus}/${customPreset.breakTime} min • ${customPreset.cycles} sessions`
                    : 'Set custom times'}
                </span>
              </button>
            </div>

            <div className="flex justify-end gap-6 mt-8">
              <button type="button" className="text-btn" onClick={onClose}>Cancel</button>
              <button type="button" className="primary-btn" onClick={handleStartSession}>Start</button>
            </div>
          </div>

          {/* ── Custom Editor View ── */}
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
              <StepperRow
                label="Focus duration"
                value={focusInput}
                onChange={setFocusInput}
                onBlur={blurFocus}
                onAdjust={adjustFocus}
              />
              <StepperRow
                label="Break duration"
                value={breakInput}
                onChange={setBreakInput}
                onBlur={blurBreak}
                onAdjust={adjustBreak}
              />
              <StepperRow
                label="Sessions"
                value={cyclesInput}
                onChange={setCyclesInput}
                onBlur={blurCycles}
                onAdjust={adjustCycles}
              />

              <p className="text-tiny text-text-secondary text-center mt-6">
                Preview: {cyclesInput || '1'} sessions × {focusInput || '1'}m focus / {breakInput || '1'}m break
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
