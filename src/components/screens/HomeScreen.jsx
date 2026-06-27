import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { animate } from 'framer-motion';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, hexToRgba, getSessionRangeFromTimes, formatHoursToMins, getAccentColor, getStartOfDay } from '../../utils';

// Card gap (px) between card centers will be measured dynamically from the DOM at runtime.

// ---------------------------------------------------------------------------
// SubjectCard — receives a stable data-index; transforms applied imperatively
// by the carousel so this component NEVER re-renders during drag.
// ---------------------------------------------------------------------------
const ACCENT_COLORS = [
  { name: 'Dusty Rose', hex: '#c97b6e' },
  { name: 'Sage Green', hex: '#6b8f71' },
  { name: 'Warm Amber', hex: '#c49a3c' },
  { name: 'Slate Blue', hex: '#5b7a99' },
  { name: 'Muted Lavender', hex: '#8b82b8' },
  { name: 'Terracotta', hex: '#b5603a' },
  { name: 'Soft Teal', hex: '#4a8c8c' },
  { name: 'Antique Gold', hex: '#b8960c' }
];

const SubjectCard = memo(function SubjectCard({
  sub, index, isActive, onSelect, onOpenModal,
  onSetAccentColor, onLogSession, onEditSubject, onDeleteSubject,
  isEditingMode, onEditingChange, style
}) {
  const { theme, state } = useStateContext();
  const isLight = theme === 'light';
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isStartHovered, setIsStartHovered] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logHours, setLogHours] = useState('');
  const [logMinutes, setLogMinutes] = useState('');

  // Edit-in-place state
  const [editName, setEditName] = useState(sub.name);
  const [editTarget, setEditTarget] = useState(String(sub.target_hours || ''));
  const [editDeadline, setEditDeadline] = useState(
    sub.deadline ? sub.deadline.split('T')[0] : ''
  );

  const pickerRef = useRef(null);
  const logFormRef = useRef(null);

  // Calculate dynamic duration for log form display
  const parsedH = parseInt(logHours) || 0;
  const parsedM = parseInt(logMinutes) || 0;
  const durationMins = (parsedH * 60) + parsedM;

  // ── Sync edit fields when subject data changes (e.g. after a save) ────────
  useEffect(() => {
    if (!isEditingMode) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setEditName(sub.name);
      setEditTarget(String(sub.target_hours || ''));
      setEditDeadline(sub.deadline ? sub.deadline.split('T')[0] : '');
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [sub.name, sub.target_hours, sub.deadline, isEditingMode]);

  const handleCardClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(index);
  }, [index, onSelect]);

  const handleStartSessionClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('pomodoro', sub.id);
  }, [sub.id, onOpenModal]);

  const handleLogSubmit = useCallback((e) => {
    e.stopPropagation();
    
    const parsedH = parseInt(logHours) || 0;
    const parsedM = parseInt(logMinutes) || 0;
    const diffMins = (parsedH * 60) + parsedM;

    if (diffMins <= 0) {
      alert('Sessions must be greater than 0 minutes long to count.');
      return;
    }

    if (onLogSession) {
      onLogSession(sub.id, undefined, undefined, diffMins, logDate);
    }
    setIsLogOpen(false);
    setLogHours('');
    setLogMinutes('');
    setLogDate(new Date().toISOString().split('T')[0]);
  }, [logHours, logMinutes, logDate, onLogSession, sub.id]);

  // ── Edit submit / cancel ──────────────────────────────────────────────────
  const handleEditSave = useCallback((e) => {
    e.stopPropagation();
    const parsedTarget = parseFloat(editTarget);
    if (!editName.trim() || isNaN(parsedTarget) || parsedTarget < 1) return;
    onEditSubject(
      sub.id,
      editName.trim(),
      parsedTarget,
      editDeadline ? new Date(editDeadline).toISOString() : null
    );
    onEditingChange(false);
  }, [editName, editTarget, editDeadline, sub.id, onEditSubject, onEditingChange]);

  const handleEditCancel = useCallback((e) => {
    e.stopPropagation();
    setEditName(sub.name);
    setEditTarget(String(sub.target_hours || ''));
    setEditDeadline(sub.deadline ? sub.deadline.split('T')[0] : '');
    onEditingChange(false);
  }, [sub.name, sub.target_hours, sub.deadline, onEditingChange]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    if (confirm('Delete this goal? This cannot be undone.')) {
      onDeleteSubject(sub.id);
      onEditingChange(false);
    }
  }, [sub.id, onDeleteSubject, onEditingChange]);

  // ── Outside-click handlers for picker / log form ──────────────────────────
  useEffect(() => {
    if (!isPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isLogOpen) return;
    const handleOutsideClick = (e) => {
      const cardEl = logFormRef.current?.closest('.coverflow-card');
      if (cardEl && !cardEl.contains(e.target) && !e.target.closest('.modal-backdrop') && !e.target.closest('.modal-pane')) {
        setIsLogOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isLogOpen]);

  const colorIndex = index % 8;
  const accentColor = sub.accentColor || '#c97b6e';
  const daysUntilDeadline = sub.deadline ? getDaysLeft(new Date(), sub.deadline) : null;
  let deadlineText = '';
  if (daysUntilDeadline !== null) {
    if (daysUntilDeadline > 0) {
      deadlineText = `${daysUntilDeadline} days left`;
    } else if (daysUntilDeadline === 0) {
      deadlineText = 'Due today';
    } else {
      deadlineText = 'Deadline passed';
    }
  }

  const progressPct = sub.target_hours > 0 ? Math.min(100, (sub.valid_hours / sub.target_hours) * 100) : 0;

  const subDeadlineDate = sub.deadline || state.term?.endDate;
  const daysLeft = subDeadlineDate ? getDaysLeft(getStartOfDay(), subDeadlineDate) : 0;
  const tHours = sub.target_hours || 0;
  const vHours = sub.valid_hours || 0;
  const dailyReq = daysLeft >= 0 ? (tHours - vHours) / Math.max(1, daysLeft) : 0;
  const totalPressure = dailyReq;

  const todayHours = sub.completed_today || 0;
  const todayTarget = totalPressure;
  const todayProgressPct = todayTarget > 0 ? Math.min(100, (todayHours / todayTarget) * 100) : (todayHours > 0 ? 100 : 0);

  return (
    <article
      data-card-index={index}
      className={`coverflow-card glass-surface card-theme-${colorIndex}${isActive ? ' active' : ''}${isEditingMode ? ' card-editing' : ''}`}
      style={style}
    >
      {/* ── VIEW LAYER ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col w-full h-full justify-between card-layer"
        style={{
          opacity: (isEditingMode || isLogOpen) ? 0 : 1,
          pointerEvents: (isEditingMode || isLogOpen) ? 'none' : 'auto',
          transition: 'opacity 0.25s ease',
          position: 'absolute',
          inset: 0,
          padding: 'inherit',
        }}
      >
        {/* Top/Body Area */}
        <div className="flex flex-col w-full gap-5">
          {/* Header Row */}
          <div className="flex justify-between items-start gap-4">
            <button
              type="button"
              className="subject-select text-left min-w-0 flex-1 focus:outline-none"
              onClick={handleCardClick}
            >
              <h2
                className="font-serif text-[28px] font-normal leading-tight tracking-wide truncate"
                style={{ color: isActive ? accentColor : hexToRgba(accentColor, 0.3) }}
              >
                {sub.name.trim()}
              </h2>
            </button>

            {isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPickerOpen(prev => !prev);
                  setIsLogOpen(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-text-primary transition-colors focus:outline-none flex-shrink-0"
                type="button"
                title="Choose accent color"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"></circle>
                  <circle cx="19" cy="12" r="1"></circle>
                  <circle cx="5" cy="12" r="1"></circle>
                </svg>
              </button>
            )}
          </div>

          {/* Hairline */}
          <div
            className="h-[1px] w-full mt-1"
            style={{ backgroundColor: hexToRgba(accentColor, 0.5) }}
          />

          {/* Deadline note */}
          {sub.deadline && (
            <span className="font-mono text-[10px] text-text-secondary/30">{deadlineText}</span>
          )}

          {/* PROGRESS Section */}
          <div className="flex flex-col w-full gap-2">
            <span
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: hexToRgba(accentColor, 0.7) }}
            >
              PROGRESS
            </span>
            <div className="flex justify-between items-center text-text-primary/80 font-mono text-[12px] leading-none">
              <span>{formatHoursToMins(sub.valid_hours)} / {formatHoursToMins(sub.target_hours)}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-[2px] w-full bg-text-primary/10 rounded-full overflow-hidden mt-1">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: accentColor
                }}
              />
            </div>
          </div>

          {/* TODAY'S PROGRESS Section */}
          {!isPickerOpen && (
            <div className="flex flex-col w-full gap-2 mt-1">
              <span
                className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
                style={{ color: hexToRgba(accentColor, 0.7) }}
              >
                TODAY'S PROGRESS
              </span>
              <div className="flex justify-between items-center text-text-primary/80 font-mono text-[12px] leading-none">
                <span>{formatHoursToMins(todayHours)} / {formatHoursToMins(todayTarget)}</span>
                <span>{Math.round(todayProgressPct)}%</span>
              </div>
              <div className="h-[2px] w-full bg-text-primary/10 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${todayProgressPct}%`,
                    backgroundColor: accentColor
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTA row */}
        <div className="flex justify-between items-center mt-auto pt-6 border-t border-text-primary/5">
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartSessionClick}
              onMouseEnter={() => setIsStartHovered(true)}
              onMouseLeave={() => setIsStartHovered(false)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none"
              style={{
                borderColor: accentColor,
                color: accentColor,
                backgroundColor: isStartHovered ? hexToRgba(accentColor, 0.08) : 'transparent'
              }}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Start session</span>
            </button>
            <span className="text-text-secondary/20 text-xs select-none">•</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLogOpen(prev => !prev);
                setIsPickerOpen(false);
              }}
              className="text-[13px] text-text-secondary/60 hover:text-text-primary hover:opacity-100 transition-all font-sans flex items-center gap-1 cursor-pointer focus:outline-none"
              type="button"
            >
              <span>+ Log session</span>
            </button>
          </div>
        </div>

        {/* Inline Color Picker */}
        <div
          ref={pickerRef}
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: isPickerOpen ? '200px' : '0px',
            opacity: isPickerOpen ? 1 : 0,
            marginTop: isPickerOpen ? '1rem' : '0px'
          }}
        >
          <div className="flex flex-col w-full py-2 border-t border-text-primary/5">
            <div className="flex justify-between items-center mb-3 text-[11px] text-text-secondary/50">
              <span>Choose accent color</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 mb-2">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColor === getAccentColor(color.hex, isLight);
                return (
                  <button
                    key={color.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetAccentColor(sub.id, color.hex);
                    }}
                    className="flex flex-col items-center group focus:outline-none"
                    type="button"
                  >
                    <div
                      className="w-8 h-8 rounded-[6px] relative flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: getAccentColor(color.hex, isLight),
                        boxShadow: isSelected ? `0 0 0 2px ${isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.4)'}` : 'none'
                      }}
                    >
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isLight ? "#ffffff" : "#1a1a1a"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span className="text-[9px] text-text-secondary/30 mt-1 text-center truncate w-full group-hover:text-text-secondary/50">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ── LOG SESSION LAYER ────────────────────────────────────────────────── */}
      <div
        ref={logFormRef}
        className="flex flex-col w-full h-full justify-between card-layer"
        style={{
          opacity: isLogOpen ? 1 : 0,
          pointerEvents: isLogOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          position: 'absolute',
          inset: 0,
          padding: 'inherit',
          background: 'var(--card-bg)',
          borderRadius: 'inherit',
          zIndex: 10
        }}
      >
        {/* Log header */}
        <div className="flex flex-col gap-5 w-full">
          <div className="flex justify-between items-center">
            <span
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: hexToRgba(accentColor, 0.7) }}
            >
              LOG SESSION
            </span>
          </div>

          {/* Hairline */}
          <div
            className="h-[1px] w-full"
            style={{ backgroundColor: hexToRgba(accentColor, 0.5) }}
          />

          {/* Date field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
              Date
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[13px] font-mono text-text-primary/70 focus:outline-none focus:border-text-primary/30 transition-colors"
            />
          </div>

          {/* Times Row */}
          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
                Hours
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={logHours}
                onChange={(e) => setLogHours(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[13px] font-mono text-text-primary/70 focus:outline-none focus:border-text-primary/30 transition-colors"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
                Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[13px] font-mono text-text-primary/70 focus:outline-none focus:border-text-primary/30 transition-colors"
              />
            </div>
          </div>

          {/* Duration display */}
          {durationMins > 0 && (
            <div className="flex justify-between items-center text-xs text-text-secondary/60 font-sans px-1 mt-1">
              <span>Calculated Duration:</span>
              <span className="font-mono text-white font-medium" style={{ color: accentColor }}>
                {formatHoursToMins(durationMins / 60)}
              </span>
            </div>
          )}
        </div>

        {/* Log CTA */}
        <div className="flex justify-between items-center mt-auto pt-5 border-t border-text-primary/5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLogOpen(false);
            }}
            className="text-[13px] text-text-secondary/40 hover:text-text-primary/70 transition-colors font-sans focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLogSubmit}
            disabled={durationMins <= 0}
            className="px-4 py-1.5 rounded-lg text-[13px] text-white font-medium hover:brightness-110 transition-all focus:outline-none disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: accentColor }}
          >
            Log Time
          </button>
        </div>
      </div>

      {/* ── EDIT LAYER ─────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col w-full h-full justify-between card-layer"
        style={{
          opacity: isEditingMode ? 1 : 0,
          pointerEvents: isEditingMode ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          position: 'absolute',
          inset: 0,
          padding: 'inherit',
        }}
      >
        {/* Edit header */}
        <div className="flex flex-col gap-5 w-full">
          <div className="flex justify-between items-center">
            <span
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: hexToRgba(accentColor, 0.7) }}
            >
              EDITING
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary/30 hover:text-red-400 hover:bg-red-400/10 transition-all focus:outline-none"
              title="Delete goal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"></path>
                <path d="M8 6V4h8v2"></path>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
              </svg>
            </button>
          </div>

          {/* Hairline */}
          <div
            className="h-[1px] w-full"
            style={{ backgroundColor: hexToRgba(accentColor, 0.5) }}
          />

          {/* Name field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
              Goal Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
              className="w-full bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[15px] font-serif text-text-primary/90 focus:outline-none focus:border-text-primary/30 transition-colors"
              style={{ caretColor: accentColor }}
            />
          </div>

          {/* Target Hours field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
              Target Hours
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTarget(p => String(Math.max(1, (parseInt(p) || 1) - 1)));
                }}
                className="w-8 h-8 rounded-lg bg-text-primary/5 border border-text-primary/10 text-text-secondary/60 hover:text-text-primary hover:bg-text-primary/10 transition-all focus:outline-none flex items-center justify-center text-lg leading-none"
              >−</button>
              <input
                type="number"
                min="1"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[15px] font-mono text-text-primary/90 text-center focus:outline-none focus:border-text-primary/30 transition-colors"
                style={{ caretColor: accentColor }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTarget(p => String((parseInt(p) || 0) + 1));
                }}
                className="w-8 h-8 rounded-lg bg-text-primary/5 border border-text-primary/10 text-text-secondary/60 hover:text-text-primary hover:bg-text-primary/10 transition-all focus:outline-none flex items-center justify-center text-lg leading-none"
              >+</button>
            </div>
          </div>

          {/* Deadline field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase text-text-secondary/40">
              Deadline <span className="normal-case text-text-secondary/25">(optional)</span>
            </label>
            <input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-text-primary/5 border border-text-primary/10 rounded-lg px-3 py-2 text-[13px] font-mono text-text-primary/70 focus:outline-none focus:border-text-primary/30 transition-colors"
            />
          </div>
        </div>

        {/* Edit CTA */}
        <div className="flex justify-between items-center mt-auto pt-5 border-t border-text-primary/5">
          <button
            type="button"
            onClick={handleEditCancel}
            className="text-[13px] text-text-secondary/40 hover:text-text-primary/70 transition-colors font-sans focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleEditSave}
            className="px-4 py-1.5 rounded-lg text-[13px] text-white font-medium hover:brightness-110 transition-all focus:outline-none"
            style={{ backgroundColor: accentColor }}
          >
            Save changes
          </button>
        </div>
      </div>
    </article>
  );
}, (prev, next) =>
  prev.sub === next.sub &&
  prev.isActive === next.isActive &&
  prev.index === next.index &&
  prev.isEditingMode === next.isEditingMode
);

// ---------------------------------------------------------------------------
// computeCardStyle — pure function, called both during drag (DOM mutation) and
// during React render (initial + snap). Returns a CSS transform string +
// supplemental style props.
// ---------------------------------------------------------------------------
function computeCardStyle(cardIndex, fractionalActiveIndex, stride) {
  const offset = cardIndex - fractionalActiveIndex;
  const absOffset = Math.abs(offset);
  const direction = offset >= 0 ? 1 : -1;

  const tx = offset * stride * 0.75;
  const tz = -absOffset * 25;
  const rotateY = direction * -8 * Math.min(1, absOffset);
  const scale = Math.max(0.7, 1 - absOffset * 0.1);
  const opacity = Math.max(0.5, 1 - absOffset * 0.25);
  const zIndex = Math.round(100 - absOffset * 10);

  return {
    transform: `translate3d(${tx}px, 0, ${tz}px) rotateY(${rotateY}deg) scale(${scale})`,
    opacity,
    zIndex,
  };
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
export default function HomeScreen({ onOpenModal, onLogSession, onEditSubject, onDeleteSubject, onStartSession }) {
  const { state, setSubjectAccentColor, theme } = useStateContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevSubjects, setPrevSubjects] = useState(state.subjects);
  const [editingSubjectId, setEditingSubjectId] = useState(null); // which card is being edited

  // Refs for zero-re-render drag + long-press tracking
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);    // true once movement threshold exceeded
  const isPointerDownRef = useRef(false); // true from pointerdown until pointerup
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const liveOffsetRef = useRef(0);
  const cardStrideRef = useRef(400);
  const longPressTimerRef = useRef(null);

  // Refs and state for entrance animation
  const entranceAnimRef = useRef(null);
  const isAnimatingEntranceRef = useRef(false);

  const stopEntranceAnimation = useCallback(() => {
    if (entranceAnimRef.current) {
      entranceAnimRef.current.stop();
      entranceAnimRef.current = null;
      isAnimatingEntranceRef.current = false;
    }
  }, []);

  // ── Derived-state sync ────────────────────────────────────────────────────
  if (state.subjects !== prevSubjects) {
    setPrevSubjects(state.subjects);
    if (!state.subjects.length) {
      setActiveIndex(0);
    } else {
      setActiveIndex((prev) => Math.min(prev, state.subjects.length - 1));
    }
  }

  // ── Apply transforms imperatively to all card DOM nodes ──────────────────
  const applyTransforms = useCallback((fractionalActive, animated) => {
    const track = trackRef.current;
    if (!track) return;
    const cards = track.querySelectorAll('[data-card-index]');
    cards.forEach((card) => {
      const i = parseInt(card.getAttribute('data-card-index'), 10);
      const { transform, opacity, zIndex } = computeCardStyle(i, fractionalActive, cardStrideRef.current);
      card.style.transform = transform;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
      card.style.transition = animated
        ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        : 'none';
    });
  }, []);

  // After mount (and on resize), measure card width and update stride:
  useEffect(() => {
    const measure = () => {
      const card = trackRef.current?.querySelector('[data-card-index]');
      if (card) {
        cardStrideRef.current = card.offsetWidth * 0.95;
        if (!isAnimatingEntranceRef.current) {
          applyTransforms(activeIndex, false);
        }
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIndex, applyTransforms]);

  // Apply transforms whenever activeIndex settles (React render → DOM sync)
  useEffect(() => {
    if (isAnimatingEntranceRef.current) return;
    applyTransforms(activeIndex, true);
  }, [activeIndex, state.subjects.length, applyTransforms]);

  // ── Entrance animation sweep to middle card ──────────────────────────────
  // Runs on every mount (tab switch remounts HomeScreen from scratch).
  // Uses rAF to guarantee cards are painted before we read their widths.
  useEffect(() => {
    if (state.subjects.length === 0) return;

    let rafId;
    let controls;

    const startSweep = () => {
      const card = trackRef.current?.querySelector('[data-card-index]');
      if (!card) return; // DOM not ready yet

      // Measure stride now that cards are rendered
      cardStrideRef.current = card.offsetWidth * 0.95;

      const targetIndex = Math.floor(state.subjects.length / 2);

      // Position cards at index 0 instantly with no transition
      applyTransforms(0, false);
      isAnimatingEntranceRef.current = true;

      controls = animate(0, targetIndex, {
        duration: 1.2,
        ease: [0.25, 1, 0.5, 1],
        onUpdate: (latest) => {
          applyTransforms(latest, false);
          const rounded = Math.round(latest);
          setActiveIndex((prev) => (prev !== rounded ? rounded : prev));
        },
        onComplete: () => {
          isAnimatingEntranceRef.current = false;
          entranceAnimRef.current = null;
          setActiveIndex(targetIndex);
          applyTransforms(targetIndex, true);
        },
      });

      entranceAnimRef.current = controls;
    };

    // Wait one rAF so React has flushed the DOM
    rafId = requestAnimationFrame(startSweep);

    return () => {
      cancelAnimationFrame(rafId);
      if (controls) controls.stop();
      isAnimatingEntranceRef.current = false;
      entranceAnimRef.current = null;
    };
  // Only re-run when the subjects list changes length (i.e. new mount or card added/removed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.subjects.length]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (editingSubjectId) {
        if (e.key === 'Escape') setEditingSubjectId(null);
        return;
      }
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        stopEntranceAnimation();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        stopEntranceAnimation();
        setActiveIndex((i) => Math.min(state.subjects.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.subjects.length, editingSubjectId, stopEntranceAnimation]);

  // Close editing mode on pointerdown outside the editing card
  useEffect(() => {
    if (!editingSubjectId) return;

    const handleOutsidePointerDown = (e) => {
      const editingCard = trackRef.current?.querySelector('.card-editing');
      if (editingCard && !editingCard.contains(e.target) && !e.target.closest('.modal-backdrop') && !e.target.closest('.modal-pane')) {
        setEditingSubjectId(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [editingSubjectId]);

  // ── Unified pointer handlers (long-press + drag, mutually exclusive) ────────
  //
  // Strategy:
  //   pointerdown  → record start pos, start 450ms long-press timer
  //   pointermove  → if delta > 8px, CANCEL timer and switch to drag mode
  //   pointerup    → cancel timer; if dragging, snap to nearest card
  //
  // Because we call setPointerCapture on the CONTAINER (not the card),
  // all pointermove events reliably reach this single handler regardless
  // of which child element was originally pressed. This prevents the
  // previous bug where the card's own move handler never received events
  // during a captured drag.
  // ───────────────────────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (editingSubjectId) return;
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    stopEntranceAnimation();

    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    liveOffsetRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);

    // Start long-press countdown — only fires if we don't move
    longPressTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current && !isDraggingRef.current) {
        const activeSubId = state.subjects[activeIndex]?.id;
        if (activeSubId) setEditingSubjectId(activeSubId);
      }
    }, 450);
  }, [editingSubjectId, activeIndex, stopEntranceAnimation]);

  const onPointerMove = useCallback((e) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!isDraggingRef.current && dist > 8) {
      // Movement threshold exceeded — cancel long-press and enter drag mode
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      isDraggingRef.current = true;
      trackRef.current?.classList.add('dragging');
    }

    if (isDraggingRef.current) {
      liveOffsetRef.current = -dx / cardStrideRef.current;
      applyTransforms(activeIndex + liveOffsetRef.current, false);
    }
  }, [activeIndex, applyTransforms]);

  const onPointerUp = useCallback((e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      trackRef.current?.classList.remove('dragging');
      const dx = e.clientX - startXRef.current;
      const liveOffset = -dx / cardStrideRef.current;
      const fractional = activeIndex + liveOffset;
      let next = Math.round(fractional);
      next = Math.max(0, Math.min(state.subjects.length - 1, next));
      applyTransforms(next, true);
      setActiveIndex(next);
      liveOffsetRef.current = 0;
    }
  }, [activeIndex, state.subjects.length, applyTransforms]);

  // Click on a flanking card to centre it
  const onCardSelect = useCallback((idx) => {
    stopEntranceAnimation();
    setActiveIndex(idx);
  }, [stopEntranceAnimation]);

  const handleEditingChange = useCallback((subId, editing) => {
    setEditingSubjectId(editing ? subId : null);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const daysLeft = state.term ? getDaysLeft(new Date(), state.term.endDate) : 0;
  const isTermEnded = daysLeft < 0;

  const isAnyEditing = editingSubjectId !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div id="home-screen" className="dashboard-shell animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      {/* ── Coverflow ── */}
      {state.subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-medium text-text-secondary mb-8">No goals yet.</p>
          <div className="coverflow-dots" role="tablist" aria-label="Goal navigation">
            <button
              className="coverflow-add-btn"
              onClick={() => onOpenModal('addSubject')}
              type="button"
              aria-label="Add Goal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`coverflow-container${isAnyEditing ? ' editing-active' : ''}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="coverflow-track" ref={trackRef}>
            {state.subjects.map((sub, idx) => {
              const { transform, opacity, zIndex } = computeCardStyle(idx, activeIndex, 400);
              return (
                <SubjectCard
                  key={sub.id}
                  sub={sub}
                  index={idx}
                  isActive={idx === activeIndex}
                  onSelect={onCardSelect}
                  onOpenModal={onOpenModal}
                  onSetAccentColor={setSubjectAccentColor}
                  onLogSession={onLogSession}
                  onEditSubject={onEditSubject}
                  onDeleteSubject={onDeleteSubject}
                  onStartSession={onStartSession}
                  isEditingMode={editingSubjectId === sub.id}
                  onEditingChange={(editing) => handleEditingChange(sub.id, editing)}
                  style={{ transform, opacity, zIndex }}
                />
              );
            })}
          </div>

          {/* Dot indicators and Add button */}
          <div
            className="coverflow-dots"
            role="tablist"
            aria-label="Goal navigation"
            style={{
              opacity: isAnyEditing ? 0 : 1,
              transition: 'opacity 0.3s ease',
              pointerEvents: isAnyEditing ? 'none' : 'auto'
            }}
          >
            {state.subjects.map((sub, idx) => (
              <button
                key={sub.id}
                role="tab"
                aria-selected={idx === activeIndex}
                className={`coverflow-dot${idx === activeIndex ? ' active' : ''}`}
                style={idx === activeIndex ? { backgroundColor: state.subjects[activeIndex]?.accentColor || '#c97b6e' } : {}}
                onClick={() => {
                  stopEntranceAnimation();
                  setActiveIndex(idx);
                }}
                type="button"
                aria-label={sub.name}
              />
            ))}
            <button
              className="coverflow-add-btn"
              onClick={() => onOpenModal('addSubject')}
              type="button"
              aria-label="Add Goal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {isTermEnded && (
        <div id="term-ended-banner" className="term-ended-note">
          <h2 className="text-medium text-text-primary">Term ended</h2>
          <p className="text-small text-text-secondary mt-3">No new targets are required now. The dashboard is resting in archive mode.</p>
        </div>
      )}
    </div>
  );
}
