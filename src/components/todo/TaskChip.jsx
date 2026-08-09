import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatRecurrence, formatTodoDeadline, formatCarriedFrom, getDaysCarried } from '../../utils/todoHelpers';
import { useCalendar } from '../../contexts/CalendarContext';
import { createCalendarEvent } from '../../lib/calendarClient';

export default function TaskChip({ todo, onComplete, onDelete, onUpdateTitle, isCompleting, isMobile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [addedToCalendar, setAddedToCalendar] = useState(false);
  const cancelledRef = useRef(false);
  const { isConnected } = useCalendar();

  const titleClass = `task-title font-sans text-[15px] truncate ${isMobile ? 'text-[12px] font-medium' : ''}`;

  const handleEdit = e => {
    e.stopPropagation();
    cancelledRef.current = false;
    setDraft(todo.title);
    setIsEditing(true);
  };

  const saveTitle = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    if (trimmed && trimmed !== todo.title) {
      onUpdateTitle(todo.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      cancelledRef.current = true;
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`task-chip group min-h-[44px] bg-text-primary/[0.03] border border-text-primary/[0.08] ${isMobile ? '!min-h-[32px] !py-1.5 !px-2.5 !mb-1 !rounded-md !gap-2' : ''} ${isCompleting ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ borderLeft: '3px solid var(--border-glass-bright)' }}
    >
      <div className="flex-grow min-w-0 flex flex-col opacity-[0.9]">
        {isEditing ? (
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className={`${titleClass} bg-transparent focus:outline-none w-full`}
          />
        ) : (
          <span onClick={handleEdit} className={`${titleClass} cursor-text`}>
            {todo.title}
          </span>
        )}
        {todo.original_date && todo.original_date !== todo.scheduled_date && (
          <span className={`text-[10px] font-mono flex items-center gap-1 ${getDaysCarried(todo.original_date, todo.scheduled_date) >= 3 ? 'text-amber-400/70' : 'text-text-secondary/40'}`}>
            ↩ {formatCarriedFrom(todo.original_date)}
          </span>
        )}
        {todo.note && (
          <span className={`text-[12px] text-text-secondary/50 truncate ${isMobile ? 'text-[10px]' : ''}`}>
            {todo.note}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {todo.recurrence_days?.length > 0 && (
          <span className={`text-[11px] opacity-40 font-mono ${isMobile ? 'text-[9px]' : ''}`} title="Recurrence">
            ↻ {formatRecurrence(todo.recurrence_days)}
          </span>
        )}
        {todo.deadline && !todo.recurrence_days?.length && (
          <span className="flex items-center gap-1.5">
            <span className={`text-[11px] opacity-40 font-mono ${isMobile ? 'text-[9px]' : ''}`}>
              {formatTodoDeadline(todo.deadline)}
            </span>
            {isConnected && !addedToCalendar && (
              <button
                type="button"
                title="Add to Google Calendar"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await createCalendarEvent(
                      todo.title,
                      todo.deadline.split('T')[0],
                      todo.note || ''
                    );
                    setAddedToCalendar(true);
                  } catch { /* silent fail */ }
                }}
                className={`p-0.5 text-text-secondary/30 hover:text-blue-400 transition-all ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
            )}
            {addedToCalendar && (
              <span className="text-[9px] text-blue-400/50">✓</span>
            )}
          </span>
        )}

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onComplete(todo);
          }}
          className={`relative w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 ${isCompleting ? 'border-accent bg-accent' : 'border-text-primary/20 hover:border-accent hover:bg-accent/10'} ${isMobile ? 'w-4 h-4' : ''}`}
        >
          {isCompleting && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 ${isMobile ? 'w-2.5 h-2.5' : ''}`}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete(todo.id);
          }}
          className={`text-text-secondary/20 hover:text-red-400/80 p-0.5 transition-all ${isMobile ? '' : 'opacity-0 group-hover:opacity-100'}`}
          title="Delete task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}