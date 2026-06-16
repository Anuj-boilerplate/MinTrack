import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, hexToRgba } from '../../utils';

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

const SubjectCard = memo(function SubjectCard({ sub, index, isActive, onSelect, onOpenModal, onSetAccentColor, style }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  const handleCardClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(index);
  }, [index, onSelect]);

  const handleStartSessionClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('pomodoro', sub.id);
  }, [sub.id, onOpenModal]);

  useEffect(() => {
    if (!isPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isPickerOpen]);

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

  return (
    <article
      data-card-index={index}
      className={`coverflow-card glass-surface card-theme-${colorIndex}${isActive ? ' active' : ''}`}
      style={style}
    >
      <div className="flex flex-col w-full h-full justify-between">
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
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors focus:outline-none flex-shrink-0"
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

          {/* PROGRESS Section */}
          <div className="flex flex-col w-full gap-2">
            <span 
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: hexToRgba(accentColor, 0.7) }}
            >
              PROGRESS
            </span>
            <div className="flex justify-between items-center text-white/80 font-mono text-[12px] leading-none">
              <span>{sub.valid_hours.toFixed(1)} / {sub.target_hours} hrs</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-[2px] w-full bg-white/10 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${progressPct}%`,
                  backgroundColor: accentColor 
                }}
              />
            </div>
          </div>

          {/* RECENT Section */}
          <div className="flex flex-col w-full gap-2 mt-1">
            <span 
              className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: hexToRgba(accentColor, 0.7) }}
            >
              RECENT
            </span>
            {!sub.sessions || sub.sessions.length === 0 ? (
              <div className="py-1">
                <p className="font-serif italic text-[14px] text-white/35">
                  No sessions recorded yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                {sub.sessions.slice(-3).reverse().map((session, sIdx) => {
                  const start = new Date(session.start_time);
                  const end = new Date(session.end_time);
                  const durationMin = session.duration_minutes || (!isNaN(start) && !isNaN(end) ? (end - start) / 60000 : 0);
                  const durHours = durationMin / 60;
                  
                  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                  const dateText = !isNaN(start) ? `${months[start.getMonth()]} ${start.getDate()}` : '';
                  
                  return (
                    <div key={session.id || sIdx} className="flex justify-between items-center text-[13px] text-white/60 font-sans">
                      <span className="text-white/70">Session</span>
                      <span className="font-mono text-white/40 text-xs ml-auto mr-4">{dateText}</span>
                      <span className="font-mono text-white/70">{durHours > 0 ? `${durHours.toFixed(1)}h` : '0h'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CTA row (Anchored to bottom) */}
        <div className="flex justify-between items-center mt-auto pt-6 border-t border-white/5">
          <button
            onClick={handleStartSessionClick}
            className="text-[13px] text-white hover:opacity-80 transition-opacity font-sans flex items-center gap-1 cursor-pointer focus:outline-none"
            type="button"
          >
            <span>→ Start session</span>
          </button>
          {sub.deadline && (
            <span className="font-mono text-white/50 text-[12px]">
              {deadlineText}
            </span>
          )}
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
          <div className="flex flex-col w-full py-2 border-t border-white/5">
            <div className="flex justify-between items-center mb-3 text-[11px] text-white/50">
              <span>Choose accent color</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5 mb-2">
              {ACCENT_COLORS.map((color) => {
                const isSelected = accentColor === color.hex;
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
                        backgroundColor: color.hex,
                        boxShadow: isSelected ? '0 0 0 2px rgba(255, 255, 255, 0.4)' : 'none'
                      }}
                    >
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span className="text-[9px] text-white/30 mt-1 text-center truncate w-full group-hover:text-white/50">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </article>
  );
}, (prev, next) =>
  prev.sub === next.sub &&
  prev.isActive === next.isActive &&
  prev.index === next.index
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
export default function HomeScreen({ onOpenModal }) {
  const { state, setSubjectAccentColor } = useStateContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevSubjects, setPrevSubjects] = useState(state.subjects);

  // Refs for zero-re-render drag tracking
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const liveOffsetRef = useRef(0); // fractional index offset during drag
  const cardStrideRef = useRef(400); // dynamic layout stride

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
        // Apply transforms immediately with the new measured stride
        applyTransforms(activeIndex, false);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeIndex, applyTransforms]);

  // Apply transforms whenever activeIndex settles (React render → DOM sync)
  useEffect(() => {
    applyTransforms(activeIndex, true);
  }, [activeIndex, state.subjects.length, applyTransforms]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((i) => Math.min(state.subjects.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.subjects.length]);

  // ── Drag handlers — NO setState during move ───────────────────────────────
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    liveOffsetRef.current = 0;
    trackRef.current?.classList.add('dragging');
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    // Convert pixel delta to fractional index offset
    liveOffsetRef.current = -dx / cardStrideRef.current;
    const fractional = activeIndex + liveOffsetRef.current;
    applyTransforms(fractional, false); // direct DOM — zero React re-renders
  }, [activeIndex, applyTransforms]);

  const onPointerUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    trackRef.current?.classList.remove('dragging');
    const dx = e.clientX - startXRef.current;
    const threshold = cardStrideRef.current * 0.22; // ~22% of stride
    let next = activeIndex;
    if (dx < -threshold) next = Math.min(state.subjects.length - 1, activeIndex + 1);
    else if (dx > threshold) next = Math.max(0, activeIndex - 1);
    // Snap: apply animated transforms immediately then commit to React state
    applyTransforms(next, true);
    setActiveIndex(next);
    liveOffsetRef.current = 0;
  }, [activeIndex, state.subjects.length, applyTransforms]);

  // Click on a flanking card to centre it
  const onCardSelect = useCallback((idx) => {
    setActiveIndex(idx);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const daysLeft = state.term ? getDaysLeft(new Date(), state.term.endDate) : 0;
  const isTermEnded = daysLeft < 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div id="home-screen" className="dashboard-shell animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">

      {/* ── Header Actions ── */}
      <header className="flex justify-end items-center gap-4 w-full pt-4 md:pt-8 px-2">
        <button 
          onClick={() => onOpenModal('manualLog')} 
          className="glass-icon-btn-light" 
          title="Log past session"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <button 
          onClick={() => onOpenModal('settings')} 
          className="glass-icon-btn-light" 
          title="Settings"
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.5 1z"></path>
          </svg>
        </button>
      </header>

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
          className="coverflow-container"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="coverflow-track" ref={trackRef}>
            {state.subjects.map((sub, idx) => {
              // Initial style computed synchronously so first paint is correct.
              // After mount, applyTransforms() takes over via useEffect.
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
                  style={{ transform, opacity, zIndex }}
                />
              );
            })}
          </div>

          {/* Dot indicators and Add button */}
          <div className="coverflow-dots" role="tablist" aria-label="Goal navigation">
            {state.subjects.map((sub, idx) => (
              <button
                key={sub.id}
                role="tab"
                aria-selected={idx === activeIndex}
                className={`coverflow-dot${idx === activeIndex ? ' active' : ''}`}
                style={idx === activeIndex ? { backgroundColor: state.subjects[activeIndex]?.accentColor || '#c97b6e' } : {}}
                onClick={() => setActiveIndex(idx)}
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
