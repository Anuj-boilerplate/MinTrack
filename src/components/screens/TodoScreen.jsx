import { useState, useEffect } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { AnimatePresence } from 'framer-motion';

import MobileRunway from './MobileRunway';
import TaskChip from '../todo/TaskChip';
import TaskForm from '../todo/TaskForm';
import CompletedTrail from '../todo/CompletedTrail';
import { getDateForOffset, getTodosForDate } from '../../utils/todoHelpers';
import { formatEventTime } from '../../utils/calendarHelpers';
import { useCalendar } from '../../contexts/CalendarContext';

export default function TodoScreen({ isActive }) {
  const {
    state,
    addTodo,
    toggleTodoCompleted,
    toggleTodoScratched,
    deleteTodo,
    updateTodoTitle
  } = useStateContext();

  const { isConnected, events: calendarEvents, fetchEventsForRange } = useCalendar();

  // Pivot date centering the 7-day runway window
  const [pivotDate, setPivotDate] = useState(new Date());
  const [activeDateStr, setActiveDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [isJumpNavigating, setIsJumpNavigating] = useState(false);

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
  const [completingIds, setCompletingIds] = useState([]);

  // Fetch calendar events for the visible runway window
  useEffect(() => {
    if (!isConnected || !isActive) return;
    const startStr = getDateForOffset(-2, pivotDate);
    const endStr = getDateForOffset(4, pivotDate);
    fetchEventsForRange(startStr, endStr);
  }, [isConnected, isActive, pivotDate, fetchEventsForRange]);

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

  const handleUncomplete = (todoId) => {
    const todo = state.todos.find(t => t.id === todoId);
    if (todo?.recurrence_days?.length > 0) toggleTodoScratched(todoId);
    else toggleTodoCompleted(todoId);
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

  const handleAddTask = async (title, note, deadline, recurrenceDays) => {
    if (!title.trim()) return;
    const targetDate = recurrenceDays && recurrenceDays.length > 0 ? null : activeDateStr;
    await addTodo(title.trim(), note.trim(), deadline || null, targetDate, recurrenceDays && recurrenceDays.length > 0 ? recurrenceDays : null);
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

                  {/* Calendar busy indicator */}
                  {isConnected && calendarEvents[dateStr]?.length > 0 && (
                    <div className="flex flex-col gap-0.5 w-full items-center mt-2 mb-1">
                      {calendarEvents[dateStr].slice(0, 3).map((evt, i) => (
                        <div
                          key={i}
                          className="w-3/4 h-[3px] rounded-full bg-blue-400/40"
                          title={evt.summary}
                        />
                      ))}
                      {calendarEvents[dateStr].length > 3 && (
                        <span className="text-[8px] text-text-secondary/30">
                          +{calendarEvents[dateStr].length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 w-full items-center">
                    {activeTodos.slice(0, 5).map(todo => (
                      <div key={todo.id} className="w-2 h-2 rounded-full bg-text-primary/20" title={todo.title} />
                    ))}
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

                  {/* Calendar events for active day */}
                  {isConnected && calendarEvents[dateStr]?.length > 0 && (
                    <div className="mb-4 px-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-blue-400/50 mb-1.5 block">
                        Calendar
                      </span>
                      <div className="flex flex-col gap-1">
                        {calendarEvents[dateStr].map((evt, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px] text-text-secondary/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 flex-shrink-0" />
                            <span className="truncate">{evt.summary}</span>
                            {formatEventTime(evt) && (
                              <span className="text-[9px] opacity-50 flex-shrink-0 font-mono">
                                {formatEventTime(evt)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                      <TaskForm onSubmit={handleAddTask} onCancel={() => setIsAdding(false)} activeDateStr={activeDateStr} />
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
                      {activeTodos.map(todo => (
                        <TaskChip
                          key={todo.id}
                          todo={todo}
                          onComplete={handleComplete}
                          onDelete={deleteTodo}
                          onUpdateTitle={updateTodoTitle}
                          isCompleting={completingIds.includes(todo.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Done/Trail section */}
                  {doneTodos.length > 0 && (
                    <CompletedTrail
                      doneTodos={doneTodos}
                      onUncomplete={handleUncomplete}
                      label={activeTodos.length === 0 ? 'All done ✦' : `${doneTodos.length} Completed`}
                    />
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
            completingIds={completingIds}
            handleComplete={handleComplete}
            handleAddTask={handleAddTask}
            isJumpNavigating={isJumpNavigating}
            deleteTodo={deleteTodo}
            updateTodoTitle={updateTodoTitle}
            toggleTodoCompleted={toggleTodoCompleted}
            toggleTodoScratched={toggleTodoScratched}
          />
        )}
      </div>
    </div>
  );
}