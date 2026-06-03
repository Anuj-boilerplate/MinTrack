import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';

// ---------------------------------------------------------------------------
// Module-level constants — allocated once for the lifetime of the app,
// never recreated on re-renders.
// ---------------------------------------------------------------------------
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL  = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS     = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Module-level pad helper — one allocation ever, not per-render or per-loop.
const pad = (num) => String(num).padStart(2, '0');

// Compute today's string once at module load. It won't change within a session.
const _t = new Date();
const TODAY_STR = `${_t.getFullYear()}-${pad(_t.getMonth() + 1)}-${pad(_t.getDate())}`;

// Format the display value (e.g. "Jun 1, 2026")
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const raw = dateStr.split('T')[0];
  const parts = raw.split('-');
  if (parts.length !== 3) return dateStr;
  const mIdx = parseInt(parts[1], 10) - 1;
  if (mIdx < 0 || mIdx > 11) return dateStr;
  return `${MONTHS_SHORT[mIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
};

// Parse a YYYY-MM-DD (or ISO) string into { year, month (0-indexed) }
const parseYearMonth = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
};

// ---------------------------------------------------------------------------
// DayCell — memo'd so a day button only re-renders when its own props change.
// Without this every day re-renders whenever the parent state changes.
// ---------------------------------------------------------------------------
const DayCell = memo(function DayCell({ num, isSelected, isToday, onSelect }) {
  const cls = `datepicker-day-cell select-none${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`;
  return (
    <button type="button" className={cls} onClick={onSelect}>
      {num}
    </button>
  );
});

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------
export default function DatePicker({ id, value, onChange, placeholder, required }) {
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState(() => parseYearMonth(value) ?? { year: _t.getFullYear(), month: _t.getMonth() });

  // Close on outside click — stable listener, no deps needed.
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Stable callbacks — useCallback so child elements receive the same
  // function reference across renders and React can skip re-rendering them.
  // ---------------------------------------------------------------------------
  const toggleCalendar = useCallback(() => {
    setIsOpen((prev) => {
      // Sync view to the selected date when opening
      if (!prev && value) {
        const parsed = parseYearMonth(value);
        if (parsed) setCurrentView(parsed);
      }
      return !prev;
    });
  }, [value]);

  const handlePrevMonth = useCallback((e) => {
    e.stopPropagation();
    setCurrentView((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { ...prev, month: prev.month - 1 }
    );
  }, []);

  const handleNextMonth = useCallback((e) => {
    e.stopPropagation();
    setCurrentView((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { ...prev, month: prev.month + 1 }
    );
  }, []);

  const handleSelectDay = useCallback((dayNum, e) => {
    e.stopPropagation();
    setCurrentView((prev) => {
      const dateStr = `${prev.year}-${pad(prev.month + 1)}-${pad(dayNum)}`;
      onChange({ target: { value: dateStr } });
      return prev; // view doesn't change
    });
    setIsOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange({ target: { value: '' } });
    setIsOpen(false);
  }, [onChange]);

  // ---------------------------------------------------------------------------
  // Calendar day computation — only recalculates when the view changes or
  // the selected value changes, and only when the calendar is actually open.
  // When isOpen is false this returns an empty array instantly.
  // ---------------------------------------------------------------------------
  const { year, month } = currentView;
  const selectedDateOnly = value ? value.split('T')[0] : '';

  const days = useMemo(() => {
    if (!isOpen) return [];

    const daysInMonth   = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const result = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push({ type: 'empty', key: `e-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${pad(month + 1)}-${pad(d)}`;
      result.push({
        type: 'day',
        num: d,
        key: `d-${d}`,
        isSelected: selectedDateOnly === dayStr,
        isToday: TODAY_STR === dayStr,
      });
    }
    return result;
  }, [isOpen, year, month, selectedDateOnly]);

  // Pre-bind per-day select handlers — stable references per day number,
  // so DayCell.memo can bail out correctly.
  const daySelectHandlers = useMemo(() => {
    const map = {};
    for (let d = 1; d <= 31; d++) {
      map[d] = (e) => handleSelectDay(d, e);
    }
    return map;
  }, [handleSelectDay]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="datepicker-container" ref={containerRef}>
      {/* Input trigger */}
      <div className="relative cursor-pointer" onClick={toggleCalendar}>
        <input
          type="text"
          id={id}
          className="input-field cursor-pointer pr-12 select-none"
          value={formatDateDisplay(value)}
          placeholder={placeholder || 'Select Date'}
          readOnly
          required={required}
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
      </div>

      {/* Calendar popover */}
      {isOpen && (
        <div className="datepicker-popover animate-[modalMaterialize_180ms_var(--water-ease)]">
          {/* Month navigation */}
          <div className="datepicker-header">
            <button type="button" className="datepicker-nav-btn select-none" onClick={handlePrevMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="datepicker-title">{MONTHS_FULL[month]} {year}</span>
            <button type="button" className="datepicker-nav-btn select-none" onClick={handleNextMonth}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="datepicker-weekdays">
            {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
          </div>

          {/* Day grid */}
          <div className="datepicker-days-grid">
            {days.map((day) =>
              day.type === 'empty'
                ? <div key={day.key} className="datepicker-day-cell empty" />
                : <DayCell
                    key={day.key}
                    num={day.num}
                    isSelected={day.isSelected}
                    isToday={day.isToday}
                    onSelect={daySelectHandlers[day.num]}
                  />
            )}
          </div>

          {/* Clear button for optional fields */}
          {!required && value && (
            <div className="flex justify-center mt-4 pt-3 border-t border-white/5">
              <button
                type="button"
                className="text-xs text-text-muted hover:text-text-primary transition-colors select-none"
                onClick={handleClear}
              >
                Clear Date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
