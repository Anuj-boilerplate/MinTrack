import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, formatISODateForDisplay } from '../../utils';

// Card gap (px) between card centers — drives both DOM transforms and drag threshold
const CARD_STRIDE = 400;

// ---------------------------------------------------------------------------
// SubjectCard — receives a stable data-index; transforms applied imperatively
// by the carousel so this component NEVER re-renders during drag.
// ---------------------------------------------------------------------------
const SubjectCard = memo(function SubjectCard({ sub, index, isActive, onSelect, onOpenModal, style }) {
  const handleCardClick = useCallback((e) => {
    e.stopPropagation();
    onSelect(index);
  }, [index, onSelect]);

  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('editSubject', sub.id);
  }, [sub.id, onOpenModal]);

  const handleStartSessionClick = useCallback((e) => {
    e.stopPropagation();
    onOpenModal('pomodoro', sub.id);
  }, [sub.id, onOpenModal]);

  const colorIndex = index % 8;

  return (
    <article
      data-card-index={index}
      className={`coverflow-card glass-surface card-theme-${colorIndex}${isActive ? ' active' : ''}`}
      style={style}
    >
      <div className="coverflow-card-header">
        <div className="min-w-0 flex-1">
          <button type="button" className="subject-select" onClick={handleCardClick}>
            <span className="text-medium text-text-primary block font-medium truncate tracking-tight">
              {sub.name}
            </span>
          </button>
        </div>

        <button
          className="subject-edit-button flex-shrink-0"
          title="Edit Subject"
          onClick={handleEditClick}
          type="button"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
          </svg>
        </button>
      </div>

      {isActive && (
        <div className="w-full mt-auto pt-8 animate-[fadeIn_0.25s_ease]">
          <button
            className="session-launch-btn w-full font-medium"
            onClick={handleStartSessionClick}
            type="button"
          >
            Start Session
          </button>
        </div>
      )}
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
function computeCardStyle(cardIndex, fractionalActiveIndex) {
  const offset = cardIndex - fractionalActiveIndex;
  const absOffset = Math.abs(offset);
  const direction = offset >= 0 ? 1 : -1;

  const tx = offset * CARD_STRIDE * 0.75;
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
export default function HomeScreen({ onOpenModal, toggleTheme }) {
  const { state } = useStateContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevSubjects, setPrevSubjects] = useState(state.subjects);

  // Refs for zero-re-render drag tracking
  const trackRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const liveOffsetRef = useRef(0); // fractional index offset during drag

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
      const { transform, opacity, zIndex } = computeCardStyle(i, fractionalActive);
      card.style.transform = transform;
      card.style.opacity = opacity;
      card.style.zIndex = zIndex;
      card.style.transition = animated
        ? 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        : 'none';
    });
  }, []);

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
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    // Convert pixel delta to fractional index offset
    liveOffsetRef.current = -dx / CARD_STRIDE;
    const fractional = activeIndex + liveOffsetRef.current;
    applyTransforms(fractional, false); // direct DOM — zero React re-renders
  }, [activeIndex, applyTransforms]);

  const onPointerUp = useCallback((e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = e.clientX - startXRef.current;
    const threshold = CARD_STRIDE * 0.22; // ~22% of stride
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

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div>
          <p className="text-tiny text-text-muted uppercase tracking-[0.28em] mb-5">Make every minute count.</p>
          <h1 className="wordmark">Mintrack</h1>
        </div>

        <div className="header-pill" role="group" aria-label="Dashboard actions">
          <button id="theme-toggle-btn" className="header-icon-button theme-toggle-svg-btn" title="Toggle theme" onClick={toggleTheme} type="button">
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>

          <button id="settings-btn" className="header-icon-button" title="Settings" onClick={() => onOpenModal('settings')} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Term status row ── */}
      <div className="home-meta-row">
        <div>
          <p id="term-status" className="text-display">
            {isTermEnded ? 'Term ended' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} remaining`}
          </p>
          <p id="term-dates" className="text-small text-text-secondary term-dates">
            {state.term && `${formatISODateForDisplay(state.term.startDate)} to ${formatISODateForDisplay(state.term.endDate)}`}
          </p>
        </div>
        <div className="mobile-actions-wrapper">
          <button id="manual-log-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('manualLog')}>Log Session</button>
          <button id="add-subject-btn" className="secondary-glass-btn" type="button" onClick={() => onOpenModal('addSubject')}>Add Subject</button>
        </div>
      </div>

      {/* ── Coverflow ── */}
      {state.subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-medium text-text-secondary mb-8">No subjects yet.</p>
          <button className="primary-btn" onClick={() => onOpenModal('addSubject')}>Add Subject</button>
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
              const { transform, opacity, zIndex } = computeCardStyle(idx, activeIndex);
              return (
                <SubjectCard
                  key={sub.id}
                  sub={sub}
                  index={idx}
                  isActive={idx === activeIndex}
                  onSelect={onCardSelect}
                  onOpenModal={onOpenModal}
                  style={{ transform, opacity, zIndex }}
                />
              );
            })}
          </div>

          {/* Dot indicators */}
          {state.subjects.length > 1 && (
            <div className="coverflow-dots" role="tablist" aria-label="Subject navigation">
              {state.subjects.map((sub, idx) => (
                <button
                  key={sub.id}
                  role="tab"
                  aria-selected={idx === activeIndex}
                  className={`coverflow-dot${idx === activeIndex ? ' active' : ''}`}
                  onClick={() => setActiveIndex(idx)}
                  type="button"
                  aria-label={sub.name}
                />
              ))}
            </div>
          )}
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
