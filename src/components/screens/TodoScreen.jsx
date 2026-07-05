import { useState, useEffect, useRef } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { motion, AnimatePresence } from 'framer-motion';

import MobileRunway from './MobileRunway';
import { hexToRgba, formatTodoDeadline, formatRecurrence, getDateForOffset, getTodosForDate } from '../../utils/todoHelpers';

export default function TodoScreen({ isActive }) {
  const {
    state,
    addTodo,
    toggleTodoCompleted,
    toggleTodoScratched,
    deleteTodo,
    theme
  } = useStateContext();
  const isLight = theme === 'light';

  // Pivot date centering the 7-day runway window
  const [pivotDate, setPivotDate] = useState(new Date());
  const [activeDateStr, setActiveDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isJumpNavigating, setIsJumpNavigating] = useState(false);
  const activePillRef = useRef(null);

  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeDateStr]);

  // Keyboard navigation for active date
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const current = new Date(activeDateStr);
        current.setDate(current.getDate() + (e.key === 'ArrowRight' ? 1 : -1));
        const nextDateStr = current.toISOString().split('T')[0];

        const termStart = state.term?.startDate?.split('T')[0];
        const termEnd = state.term?.endDate?.split('T')[0];
        if (termStart && nextDateStr < termStart) return;
        if (termEnd && nextDateStr > termEnd) return;

        const pivot = new Date(pivotDate);
        const diffTime = current.getTime() - pivot.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays > 4) {
          pivot.setDate(pivot.getDate() + 1);
          setPivotDate(pivot);
        } else if (diffDays < -2) {
          pivot.setDate(pivot.getDate() - 1);
          setPivotDate(pivot);
        }
        setActiveDateStr(nextDateStr);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDateStr, pivotDate, state.term]);

  // Task creation state
  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskNote, setTaskNote] = useState('');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [taskRecurrence, setTaskRecurrence] = useState([]); // Weekday indices
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium'); // low, medium, high
  const [completingIds, setCompletingIds] = useState([]);

  const handleComplete = (todo) => {
    setCompletingIds(prev => [...prev, todo.id]);
    setTimeout(() => {
      if (todo.recurrence_days && todo.recurrence_days.length > 0) {
        toggleTodoScratched(todo.id);
      } else {
        toggleTodoCompleted(todo.id);
      }
      setCompletingIds(prev => prev.filter(id => id !== todo.id));
    }, 400);
  };

  const OFFSETS = [-2, -1, 0, 1, 2, 3, 4];

  const handlePrevWeek = () => {
    const d = new Date(pivotDate);
    d.setDate(d.getDate() - 7);
    setPivotDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(pivotDate);
    d.setDate(d.getDate() + 7);
    setPivotDate(d);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setPivotDate(today);
    setActiveDateStr(today.toISOString().split('T')[0]);
    setIsJumpNavigating(true);
    setTimeout(() => setIsJumpNavigating(false), 400);
  };

  const handleAddTask = async (e) => {
    if (e) e.preventDefault();
    if (!taskTitle.trim()) return;

    // Determine target scheduled date
    const targetDate = taskRecurrence.length > 0
      ? null
      : activeDateStr;

    await addTodo(
      taskTitle.trim(),
      taskNote.trim(),
      taskDeadline || null,
      taskPriority,
      taskSubjectId || null,
      targetDate,
      taskRecurrence.length > 0 ? taskRecurrence : null
    );

    // Reset task form
    setTaskTitle('');
    setTaskNote('');
    setTaskSubjectId('');
    setTaskRecurrence([]);
    setTaskDeadline('');
    setTaskPriority('medium');
    setIsAdding(false);
  };

  return (
    <div id="todo-screen" className="pt-2 pb-12 min-h-screen text-text-primary select-none animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <div className="runway-shell">
        {/* Navigation header for shifting weeks / selecting date */}
        <div className="flex justify-between items-center mb-3 md:mb-6 px-2">
          <div className="flex flex-col">
            <span className="text-[12px] md:text-[14px] font-medium tracking-wide text-text-primary/95">
              {(() => {
                const dateObj = new Date(activeDateStr + 'T12:00:00');
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
              })()}
            </span>
            <span className="hidden md:inline text-[11px] text-text-secondary/50 font-serif italic mt-0.5">
              {activeDateStr === new Date().toISOString().split('T')[0] ? 'Showing Today' : 'Navigating runway'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-1 md:p-1.5 rounded-lg border border-text-primary/5 bg-text-primary/[0.02] hover:bg-text-primary/5 transition-all text-text-secondary/70"
              title="Previous Week"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1 rounded-lg text-[10px] md:text-[11px] font-semibold border border-text-primary/5 bg-text-primary/[0.02] hover:bg-text-primary/5 transition-all text-text-primary/90"
              type="button"
            >
              Today
            </button>

            <button
              onClick={handleNextWeek}
              className="p-1 md:p-1.5 rounded-lg border border-text-primary/5 bg-text-primary/[0.02] hover:bg-text-primary/5 transition-all text-text-secondary/70"
              title="Next Week"
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>

            <div className="relative ml-1">
              <button
                className="p-1 md:p-1.5 rounded-lg border border-text-primary/5 bg-text-primary/[0.02] hover:bg-text-primary/5 transition-all text-text-secondary/70 flex items-center justify-center"
                title="Choose custom date"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
              <input
                type="date"
                value={activeDateStr}
                min={state.term?.startDate?.split('T')[0]}
                max={state.term?.endDate?.split('T')[0]}
                onChange={(e) => {
                  if (e.target.value) {
                    const selected = new Date(e.target.value);
                    setPivotDate(selected);
                    setActiveDateStr(e.target.value);
                    setIsJumpNavigating(true);
                    setTimeout(() => setIsJumpNavigating(false), 400);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* Desktop Runway Columns wrapper */}
        <div className="hidden md:flex runway-columns px-2">
          {OFFSETS.map(offset => {
            const dateStr = getDateForOffset(offset, pivotDate);
            const dayTodos = getTodosForDate(state.todos, dateStr);

            const dateObj = new Date(dateStr + 'T12:00:00');
            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            const label = days[dateObj.getDay()];
            const dayNum = dateObj.getDate();
            const actualTodayStr = new Date().toISOString().split('T')[0];
            const isActualToday = dateStr === actualTodayStr;

            // Active vs Completed
            const activeTodos = dayTodos.filter(t => {
              if (t.recurrence_days && t.recurrence_days.length > 0) {
                return !t.is_scratched_today;
              }
              return !t.is_completed;
            });

            const doneTodos = dayTodos.filter(t => {
              if (t.recurrence_days && t.recurrence_days.length > 0) {
                return t.is_scratched_today;
              }
              return t.is_completed;
            });

            const pendingCount = activeTodos.length;
            const isActive = dateStr === activeDateStr;

            const termStart = state.term?.startDate?.split('T')[0];
            const termEnd = state.term?.endDate?.split('T')[0];
            const isOutOfBounds = (termStart && dateStr < termStart) || (termEnd && dateStr > termEnd);

            return (
              <div
                key={offset}
                onClick={() => { if (!isActive && !isOutOfBounds) setActiveDateStr(dateStr); }}
                className={`runway-col ${isActive ? 'runway-col--active' : 'runway-col--peek'} ${isOutOfBounds ? 'opacity-20 pointer-events-none' : ''}`}
              >
                {/* ── Peek content (visible when collapsed) ── */}
                <div className="runway-peek-content h-full flex flex-col items-center">
                  {/* Date Header for Peek */}
                  <div className={`flex flex-col items-center mb-6 mt-2 ${isActualToday ? 'text-accent' : 'text-text-primary/70'}`}>
                    <span className="text-[10px] tracking-wider font-bold opacity-70 mb-1">{label}</span>
                    <span className="text-[24px] font-serif leading-none">{dayNum}</span>
                    <div className="flex gap-1 mt-2 h-1.5 items-center">
                      {isActualToday && pendingCount === 0 && <div className="w-1.5 h-1.5 rounded-full bg-accent/40" />}
                      {pendingCount > 0 && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full items-center">
                    {activeTodos.slice(0, 5).map(todo => {
                      const sub = state.subjects.find(s => s.id === todo.subject_id);
                      return (
                        <div key={todo.id} className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: sub?.accentColor || 'var(--border-glass-bright)' }} title={todo.title} />
                      );
                    })}
                    {activeTodos.length > 5 && (
                      <div className="w-2 h-2 rounded-full bg-text-primary/20" title={`${activeTodos.length - 5} more`} />
                    )}
                    {dayTodos.length === 0 && (
                      <div className="opacity-20 text-[10px]">—</div>
                    )}
                  </div>
                </div>

                {/* ── Active content (visible when expanded) ── */}
                <div className="runway-active-content">
                  {/* Date Header for Active */}
                  <div className="flex items-end gap-3 mb-6 px-1">
                    <span className={`text-[36px] font-serif leading-none ${isActualToday ? 'text-accent' : 'text-text-primary'}`}>{dayNum}</span>
                    <div className="flex flex-col pb-1">
                      <span className="text-[12px] tracking-widest font-bold opacity-50 uppercase">{label}</span>
                      <span className="text-[11px] opacity-40 font-mono">
                        {pendingCount} {pendingCount === 1 ? 'task' : 'tasks'} remaining
                      </span>
                    </div>
                  </div>
                  {/* Inline task creation */}
                  <div className="mb-6">
                    {!isAdding ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                        className="w-full text-left px-4 py-3 rounded-xl bg-text-primary/[0.02] border border-text-primary/[0.04] text-text-secondary/50 hover:bg-text-primary/[0.04] hover:border-text-primary/[0.08] transition-all text-[14px] flex items-center gap-2"
                        type="button"
                      >
                        <span className="text-[18px] font-light leading-none mb-0.5 opacity-60">+</span> What needs doing?
                      </button>
                    ) : (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="p-4 rounded-xl border border-text-primary/10 bg-text-primary/[0.02] flex flex-col gap-3 overflow-hidden"
                        onSubmit={handleAddTask}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          placeholder="What needs to be done?"
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="bg-transparent font-sans text-[16px] font-medium placeholder-text-secondary/30 focus:outline-none w-full"
                          autoFocus
                          required
                        />

                        <AnimatePresence>
                          {taskTitle.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="flex flex-col gap-3 overflow-hidden"
                            >
                              <input
                                type="text"
                                placeholder="Add a note..."
                                value={taskNote}
                                onChange={(e) => setTaskNote(e.target.value)}
                                className="bg-transparent text-[13px] text-text-secondary/60 placeholder-text-secondary/20 focus:outline-none w-full mt-1"
                              />

                              {/* Inline Toolbar */}
                              <div className="flex flex-wrap gap-x-5 gap-y-3 items-center pt-3 border-t border-text-primary/5">
                                {/* Subject Picker */}
                                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-4">
                                  <span className="text-[10px] text-text-secondary/40 font-semibold uppercase tracking-widest mr-1 shrink-0">Subj</span>
                                  <button type="button" onClick={() => setTaskSubjectId('')} className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${!taskSubjectId ? 'border-text-primary/30 bg-text-primary/5 text-text-primary' : 'border-transparent text-text-secondary/50 hover:bg-text-primary/5 hover:text-text-primary'}`}>
                                    <div className="w-2 h-2 rounded-full bg-text-primary/20" />
                                    <span className="text-[11px] font-medium">None</span>
                                  </button>
                                  {state.subjects.map(s => (
                                    <button key={s.id} type="button" onClick={() => setTaskSubjectId(s.id)} className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${taskSubjectId === s.id ? 'border-text-primary/30 bg-text-primary/5 text-text-primary' : 'border-transparent text-text-secondary/50 hover:bg-text-primary/5 hover:text-text-primary'}`}>
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.accentColor }} />
                                      <span className="text-[11px] font-medium">{s.name}</span>
                                    </button>
                                  ))}
                                </div>
                                {/* Priority Picker removed */}

                                {/* Deadline Date */}
                                <div className="flex items-center ml-auto">
                                  <span className="text-[10px] text-text-secondary/40 font-semibold uppercase tracking-widest mr-2">Deadline</span>
                                  <input
                                    type="date"
                                    value={taskDeadline}
                                    onChange={(e) => setTaskDeadline(e.target.value)}
                                    className="bg-text-primary/5 border border-text-primary/5 rounded-lg px-2 py-1 text-[11px] text-text-secondary focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Weekday selector for recurrence */}
                              <div className="flex flex-col gap-2 pt-3 border-t border-text-primary/5">
                                <span className="text-[10px] text-text-secondary/40 font-semibold uppercase tracking-widest">Repeat</span>
                                <div className="flex gap-1.5">
                                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayChar, i) => {
                                    const dayVal = i === 6 ? 0 : i + 1;
                                    const isSelected = taskRecurrence.includes(dayVal);
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setTaskRecurrence(taskRecurrence.filter(d => d !== dayVal));
                                          } else {
                                            setTaskRecurrence([...taskRecurrence, dayVal]);
                                          }
                                        }}
                                        className={`w-7 h-7 rounded-full text-[11px] font-medium flex items-center justify-center transition-all ${isSelected
                                          ? 'bg-brand-accent text-white shadow-sm'
                                          : 'bg-text-primary/5 text-text-secondary/50 hover:bg-text-primary/10'
                                          }`}
                                      >
                                        {dayChar}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="flex justify-end gap-2 pt-2 mt-2">
                                <button
                                  onClick={() => setIsAdding(false)}
                                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-secondary/50 hover:text-text-primary transition-colors"
                                  type="button"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-1.5 rounded-lg text-[12px] bg-text-primary text-background-main font-semibold hover:opacity-90 transition-opacity"
                                >
                                  Add Task
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.form>
                    )}
                  </div>

                  {/* Empty State */}
                  {dayTodos.length === 0 && !isAdding && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary/15 mb-3">
                        <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"></polygon>
                      </svg>
                      <p className="font-serif italic text-[16px] text-text-secondary/30">
                        Nothing left for today.
                      </p>
                      <p className="font-serif italic text-[16px] text-text-secondary/30">
                        Enjoy the quiet.
                      </p>
                    </div>
                  )}

                  {/* Active tasks list */}
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {activeTodos.map(todo => {
                        const sub = state.subjects.find(s => s.id === todo.subject_id);
                        const accentColor = sub?.accentColor || 'var(--border-glass-bright)';

                        const borderColor = hexToRgba(accentColor, 0.75);
                        const isCompleting = completingIds.includes(todo.id);

                        return (
                          <motion.div
                            key={todo.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`task-chip group min-h-[44px] bg-text-primary/[0.03] border border-text-primary/[0.08] ${isCompleting ? 'opacity-50 pointer-events-none' : ''}`}
                            style={{ borderLeft: `4px solid ${borderColor}` }}
                          >
                            <div
                              className="task-chip-dot"
                              style={{ backgroundColor: accentColor }}
                            />

                            <div className="flex-grow min-w-0 flex flex-col opacity-[0.9]">
                              <span className="task-title font-sans text-[15px] truncate">
                                {todo.title}
                              </span>
                              {todo.note && (
                                <span className="text-[12px] text-text-secondary/50 truncate">
                                  {todo.note}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              {todo.recurrence_days && todo.recurrence_days.length > 0 && (
                                <span className="text-[11px] opacity-40 font-mono" title="Recurrence">
                                  ↻ {formatRecurrence(todo.recurrence_days)}
                                </span>
                              )}
                              {todo.deadline && !todo.recurrence_days && (
                                <span className="text-[11px] opacity-40 font-mono">
                                  {formatTodoDeadline(todo.deadline)}
                                </span>
                              )}

                              <button
                                onClick={() => handleComplete(todo)}
                                className={`relative w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 ${isCompleting ? 'border-accent bg-accent' : 'border-text-primary/20 hover:border-accent hover:bg-accent/10'}`}
                                type="button"
                              >
                                {isCompleting && (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </button>

                              <button
                                onClick={() => deleteTodo(todo.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary/20 hover:text-red-400/80 p-0.5"
                                type="button"
                                title="Delete task"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Done/Trail section */}
                  {doneTodos.length > 0 && (
                    <div className="mt-6">
                      <div className="done-trail-divider">
                        <span className="font-semibold text-[10px] tracking-wider">
                          {activeTodos.length === 0 ? 'All done ✦' : `${doneTodos.length} Completed`}
                        </span>
                        <div className="h-[1px] bg-text-primary/10 flex-grow" />
                      </div>

                      <div className="space-y-2 opacity-50">
                        {doneTodos.map(todo => {
                          const sub = state.subjects.find(s => s.id === todo.subject_id);
                          const accentColor = sub?.accentColor || 'var(--text-muted)';

                          return (
                            <div
                              key={todo.id}
                              className="task-chip scratched"
                              style={{ borderLeft: `3px solid ${hexToRgba(accentColor, 0.4)}` }}
                            >
                              <div
                                className="task-chip-dot opacity-40"
                                style={{ backgroundColor: accentColor }}
                              />
                              <div className="flex-grow min-w-0 flex flex-col">
                                <span className="task-title font-sans text-[15px] truncate flex items-center gap-1.5">
                                  {todo.title}
                                  {todo.recurrence_days && todo.recurrence_days.length > 0 && (
                                    <span className="text-[14px] text-accent font-bold" title="Recurring task">↻</span>
                                  )}
                                </span>
                                {todo.note && (
                                  <span className="text-[12px] text-text-secondary/40 truncate">
                                    {todo.note}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={() => {
                                    if (todo.recurrence_days && todo.recurrence_days.length > 0) {
                                      toggleTodoScratched(todo.id);
                                    } else {
                                      toggleTodoCompleted(todo.id);
                                    }
                                  }}
                                  className="w-5 h-5 rounded-full border border-accent flex items-center justify-center bg-accent/10"
                                  type="button"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Swipe Carousel */}
        {isActive && (
          <MobileRunway
            className="flex md:hidden"
            activeDateStr={activeDateStr}
            setActiveDateStr={setActiveDateStr}
            state={state}
            isAdding={isAdding} setIsAdding={setIsAdding}
            taskTitle={taskTitle} setTaskTitle={setTaskTitle}
            taskNote={taskNote} setTaskNote={setTaskNote}
            taskSubjectId={taskSubjectId} setTaskSubjectId={setTaskSubjectId}
            taskRecurrence={taskRecurrence} setTaskRecurrence={setTaskRecurrence}
            taskDeadline={taskDeadline} setTaskDeadline={setTaskDeadline}
            taskPriority={taskPriority} setTaskPriority={setTaskPriority}
            handleAddTask={handleAddTask}
            completingIds={completingIds}
            handleComplete={handleComplete}
            deleteTodo={deleteTodo}
            isJumpNavigating={isJumpNavigating}
          />
        )}
      </div>
    </div>
  );
}
