import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { useStateContext } from '../../contexts/StateContext';

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
      <span className="stepper-label modal-label">{label}</span>
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
          className="stepper-value animate-none"
          style={{ caretColor: 'var(--accent-soft)' }}
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
  standard: { focus: 25, breakTime: 5, cycles: 4 },
  deep: { focus: 50, breakTime: 10, cycles: 4 },
  ultradian: { focus: 90, breakTime: 20, cycles: 2 },
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
export default function PomodoroConfigModal({ onClose, onStart, subjectId, accentColor = '#c97b6e' }) {
  const { state } = useStateContext();
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [view, setView] = useState('presets'); // 'presets' | 'custom'
  const [customPreset, setCustomPreset] = useState(null);
  const [focusInput, setFocusInput] = useState('25');
  const [breakInput, setBreakInput] = useState('5');
  const [cyclesInput, setCyclesInput] = useState('4');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const tasks = state.todos.filter(t => t.subject_id === subjectId && !t.is_completed);

  const presetsPaneRef = useRef(null);
  const customPaneRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(350);

  const [prevSelectedPreset, setPrevSelectedPreset] = useState(selectedPreset);
  const [prevCustomPreset, setPrevCustomPreset] = useState(customPreset);

  if (selectedPreset !== prevSelectedPreset || customPreset !== prevCustomPreset) {
    setPrevSelectedPreset(selectedPreset);
    setPrevCustomPreset(customPreset);
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
  }

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
  }, [view, isDropdownOpen]);

  // ---------------------------------------------------------------------------
  // Stable adjust/blur handlers — named per-field, empty deps because
  // useState setters are guaranteed stable references across renders.
  // Replaces the factory pattern so JSX passes the same function reference
  // every render → StepperRow.memo can bail out correctly.
  // ---------------------------------------------------------------------------
  const adjustFocus = useCallback((d) => setFocusInput((p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);
  const adjustBreak = useCallback((d) => setBreakInput((p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);
  const adjustCycles = useCallback((d) => setCyclesInput((p) => String(Math.max(1, (parseInt(p) || 1) + d))), []);

  const blurFocus = useCallback(() => setFocusInput((p) => p === '' ? '1' : String(clamp(p))), []);
  const blurBreak = useCallback(() => setBreakInput((p) => p === '' ? '1' : String(clamp(p))), []);
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
      taskId:      selectedTaskId
    });
  }, [onStart, focusInput, breakInput, cyclesInput, selectedTaskId]);

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
    <motion.div
      id="pomodoro-modal"
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="modal-slider-viewport" style={{ height: `${viewportHeight}px` }}>

          {/* ── Preset Picker View ── */}
          <div ref={presetsPaneRef} className={`modal-slide-pane ${view === 'presets' ? 'active-left' : 'inactive-left'}`}>
            <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-6">
              <h2 className="modal-heading m-0">Configure Session</h2>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-text-primary hover:bg-text-primary/5 transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="radio-cards-grid">
              {['standard', 'deep', 'ultradian'].map((key) => {
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`relative rounded-[14px] border p-5 text-left w-full transition-all focus:outline-none overflow-hidden ${isSelected
                        ? 'bg-white/[0.08]'
                        : 'border-text-primary/10 bg-text-primary/5 hover:border-text-primary/20'
                      }`}
                    style={{ borderColor: isSelected ? accentColor : undefined }}
                    onClick={() => setSelectedPreset(key)}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: accentColor }} />
                    )}
                    <span className="block font-serif text-[18px] font-normal text-text-primary/90">{PRESET_LABELS[key]}</span>
                    <span className="block font-mono text-[10px] text-text-secondary/40 mt-1">{PRESET_SUBTITLES[key]}</span>
                  </button>
                );
              })}

              <button
                type="button"
                className={`relative rounded-[14px] border p-5 text-left w-full transition-all focus:outline-none overflow-hidden ${selectedPreset === 'custom'
                    ? 'bg-white/[0.08]'
                    : 'border-text-primary/10 bg-text-primary/5 hover:border-text-primary/20'
                  }`}
                style={{ borderColor: selectedPreset === 'custom' ? accentColor : undefined }}
                onClick={handleSelectCustomCard}
              >
                {selectedPreset === 'custom' && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: accentColor }} />
                )}
                <span className="block font-serif text-[18px] font-normal text-text-primary/90">Custom</span>
                <span className="block font-mono text-[10px] text-text-secondary/40 mt-1">
                  {customPreset !== null
                    ? `${customPreset.focus}/${customPreset.breakTime} min • ${customPreset.cycles} sessions`
                    : 'Set custom times'}
                </span>
              </button>
            </div>

            {/* Working on Section */}
            <div className="mt-6 mb-2">
              <h3 className="font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-text-secondary/40 mb-3">
                Working on
              </h3>
              
              <div className="relative">
                {/* Dropdown Trigger */}
                <button
                  type="button"
                  className="w-full flex justify-between items-center px-4 py-3 rounded-lg border text-sm font-sans transition-all focus:outline-none bg-text-primary/5 hover:border-text-primary/20"
                  style={{
                    borderColor: selectedTaskId ? accentColor : 'var(--border-glass)',
                    color: selectedTaskId ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                >
                  <span className="truncate">
                    {selectedTaskId 
                      ? tasks.find(t => t.id === selectedTaskId)?.title || 'No specific task'
                      : 'No specific task'}
                  </span>
                  <svg 
                    className={`w-4 h-4 text-text-secondary/45 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {/* Dropdown Options Menu */}
                {isDropdownOpen && (
                  <div 
                    className="w-full mt-2 bg-white/[0.02] border border-text-primary/10 rounded-lg overflow-hidden max-h-[160px] overflow-y-auto custom-scrollbar"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {tasks.map((task) => {
                      const isSelected = selectedTaskId === task.id;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm font-sans border-b border-text-primary/10 hover:bg-text-primary/5 transition-all block truncate"
                          style={{
                            color: isSelected ? accentColor : 'var(--text-secondary)',
                            backgroundColor: isSelected ? 'var(--bg-glass-recessed)' : 'transparent'
                          }}
                          onClick={() => {
                            setSelectedTaskId(task.id);
                            setIsDropdownOpen(false);
                          }}
                        >
                          {task.title}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm font-sans hover:bg-text-primary/5 transition-all block"
                      style={{
                        color: selectedTaskId === null ? accentColor : 'var(--text-muted)',
                        backgroundColor: selectedTaskId === null ? 'var(--bg-glass-recessed)' : 'transparent'
                      }}
                      onClick={() => {
                        setSelectedTaskId(null);
                        setIsDropdownOpen(false);
                      }}
                    >
                      No specific task
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-text-primary/5">
              <button
                type="button"
                className="px-8 py-3 rounded-full text-sm font-medium bg-text-primary/10 text-text-primary hover:bg-text-primary/20 transition-colors border border-text-primary/10 w-full"
                onClick={handleStartSession}
                style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}
              >
                Start Session
              </button>
            </div>
          </div>

          {/* ── Custom Editor View ── */}
          <div ref={customPaneRef} className={`modal-slide-pane ${view === 'custom' ? 'active-right' : 'inactive-right'}`}>
            <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <button type="button" className="modal-back-btn m-0" onClick={handleBackToPresets}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"></line>
                    <polyline points="12 19 5 12 12 5"></polyline>
                  </svg>
                </button>
                <h2 className="modal-heading m-0">Pomodoro Settings</h2>
              </div>
            </div>

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

              <p className="font-mono text-[11px] text-text-secondary/30 text-center mt-6">
                Preview: {cyclesInput || '1'} sessions × {focusInput || '1'}m focus / {breakInput || '1'}m break
              </p>

              <div className="flex justify-end mt-4 pt-4 border-t border-text-primary/5">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-full text-sm font-medium bg-text-primary/10 text-text-primary hover:bg-text-primary/20 transition-colors border border-text-primary/10 w-full"
                  style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40`, color: accentColor }}
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
