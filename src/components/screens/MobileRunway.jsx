import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { getDateForOffset, getTodosForDate, hexToRgba, formatTodoDeadline, formatRecurrence } from '../../utils/todoHelpers';

export default function MobileRunway({
  activeDateStr,
  setActiveDateStr,
  state,
  isAdding, setIsAdding,
  taskTitle, setTaskTitle,
  taskNote, setTaskNote,
  taskSubjectId, setTaskSubjectId,
  taskRecurrence, setTaskRecurrence,
  taskDeadline, setTaskDeadline,
  taskPriority, setTaskPriority,
  handleAddTask,
  completingIds,
  handleComplete,
  deleteTodo,
  isJumpNavigating,
  className
}) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardWidth = windowWidth * 0.72; // 72vw per card (leaves edge peek)
  const gap = 12;
  const slideDistance = cardWidth + gap;
  const paddingToCenter = (windowWidth - cardWidth) / 2;

  // Absolute coordinate system
  const actualTodayStr = new Date().toISOString().split('T')[0];
  const todayDate = new Date(actualTodayStr + 'T12:00:00');
  const activeDate = new Date(activeDateStr + 'T12:00:00');
  const activeIndex = Math.round((activeDate - todayDate) / (1000 * 60 * 60 * 24));

  // Dynamic opacities anchored to absolute space
  const targetXCenter = -activeIndex * slideDistance;
  const opacityCenter = useTransform(x, [targetXCenter - slideDistance, targetXCenter, targetXCenter + slideDistance], [0.4, 1, 0.4]);

  const targetXLeft = -(activeIndex - 1) * slideDistance;
  const opacityLeft = useTransform(x, [targetXLeft - slideDistance, targetXLeft, targetXLeft + slideDistance], [0.4, 1, 0.4]);

  const targetXRight = -(activeIndex + 1) * slideDistance;
  const opacityRight = useTransform(x, [targetXRight - slideDistance, targetXRight, targetXRight + slideDistance], [0.4, 1, 0.4]);

  const headerOpacity = useTransform(x, [targetXCenter - slideDistance, targetXCenter, targetXCenter + slideDistance], [0.2, 1, 0.2]);
  const headerScale = useTransform(x, [targetXCenter - slideDistance, targetXCenter, targetXCenter + slideDistance], [0.9, 1, 0.9]);

  const handleDragEnd = (event, info) => {
    const currentX = x.get();
    let targetIndex = Math.round(currentX / -slideDistance);

    // Fast flick handling
    if (info.velocity.x < -400 && targetIndex >= activeIndex) {
      targetIndex = activeIndex + 1;
    } else if (info.velocity.x > 400 && targetIndex <= activeIndex) {
      targetIndex = activeIndex - 1;
    }

    // Clamp targetIndex based on term boundaries
    const d = new Date(actualTodayStr + 'T12:00:00');
    d.setDate(d.getDate() + targetIndex);
    const targetDateStr = d.toISOString().split('T')[0];

    const termStart = state.term?.startDate?.split('T')[0];
    const termEnd = state.term?.endDate?.split('T')[0];

    if (termStart && targetDateStr < termStart) {
      targetIndex = Math.round((new Date(termStart + 'T12:00:00') - todayDate) / (1000 * 60 * 60 * 24));
    }
    if (termEnd && targetDateStr > termEnd) {
      targetIndex = Math.round((new Date(termEnd + 'T12:00:00') - todayDate) / (1000 * 60 * 60 * 24));
    }

    controls.start({
      x: targetIndex * -slideDistance,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    });

    const finalD = new Date(actualTodayStr + 'T12:00:00');
    finalD.setDate(finalD.getDate() + targetIndex);
    setActiveDateStr(finalD.toISOString().split('T')[0]);
    setIsAdding(false);
  };

  // Sync external date changes (e.g., arrow keys in header)
  useEffect(() => {
    const targetX = activeIndex * -slideDistance;
    if (Math.abs(x.get() - targetX) > 1) {
      controls.start({ x: targetX, transition: { type: "spring", stiffness: 300, damping: 30 } });
    }
  }, [activeIndex, slideDistance, x, controls]);

  // Calendar jump handling (Constraint 10)
  useEffect(() => {
    if (isJumpNavigating) {
      controls.start({
        opacity: [0, 1],
        scale: [0.95, 1],
        transition: { duration: 0.3, ease: "easeOut" }
      });
    }
  }, [activeDateStr, isJumpNavigating, controls]);

  const mobileOffsets = [activeIndex - 1, activeIndex, activeIndex + 1];

  return (
    <div className={`w-full relative overflow-hidden flex-grow ${className}`}>

      {/* Absolute fixed Header that stays in center but crossfades based on swipe */}
      <motion.div
        style={{ opacity: headerOpacity, scale: headerScale }}
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none flex flex-col items-center pt-2"
      >
        {(() => {
          const dateObj = new Date(activeDateStr + 'T12:00:00');
          const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
          const isActualToday = activeDateStr === actualTodayStr;
          const dayTodos = getTodosForDate(state.todos, activeDateStr);
          const activeTodos = dayTodos.filter(t => t.recurrence_days?.length ? !t.is_scratched_today : !t.is_completed);

          return (
            <div className="flex flex-col items-center">
              <span className={`text-[10px] tracking-widest font-bold opacity-60 uppercase ${isActualToday ? 'text-accent' : ''}`}>
                {days[dateObj.getDay()]}
              </span>
              <span className={`text-[26px] font-serif leading-none mt-0.5 ${isActualToday ? 'text-accent' : 'text-text-primary'}`}>
                {dateObj.getDate()}
              </span>
              <span className="text-[10px] opacity-40 font-mono mt-0.5">
                {activeTodos.length} remaining
              </span>
            </div>
          );
        })()}
      </motion.div>

      {/* Swipeable Track */}
      <motion.div
        drag="x"
        dragDirectionLock
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={controls}
        className="w-full h-full pt-[76px] pb-6 touch-pan-y relative"
      >
        {mobileOffsets.map(offset => {
          const dateStr = getDateForOffset(offset, new Date(actualTodayStr + 'T12:00:00'));
          const dayTodos = getTodosForDate(state.todos, dateStr);

          const activeTodos = dayTodos.filter(t => t.recurrence_days?.length ? !t.is_scratched_today : !t.is_completed);
          const doneTodos = dayTodos.filter(t => t.recurrence_days?.length ? t.is_scratched_today : t.is_completed);

          const isActive = offset === activeIndex;
          const cardOpacity = offset === activeIndex - 1 ? opacityLeft : offset === activeIndex ? opacityCenter : opacityRight;
          const isPastDate = dateStr < actualTodayStr;

          return (
            <motion.div
              key={dateStr}
              style={{
                position: 'absolute',
                left: paddingToCenter + (offset * slideDistance),
                width: cardWidth,
                opacity: cardOpacity
              }}
              className="flex-shrink-0 flex flex-col bg-text-primary/[0.02] border border-text-primary/5 rounded-xl p-2.5 h-[calc(100vh-270px)] overflow-y-auto scrollbar-none touch-pan-y"
            >
              {/* Task Add Form (Hidden on past dates to prevent historical edits) */}
              {!isPastDate && (
                <div className={`mb-3 ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  {!isAdding || !isActive ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsAdding(true); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg bg-text-primary/[0.02] border border-text-primary/[0.04] text-text-secondary/50 hover:bg-text-primary/[0.04] transition-all text-[11px] flex items-center gap-2"
                      type="button"
                    >
                      <span className="text-[12px] font-light leading-none mb-0.5 opacity-60">+</span> What needs doing?
                    </button>
                  ) : (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="p-2.5 rounded-lg border border-text-primary/10 bg-text-primary/[0.02] flex flex-col gap-2 overflow-hidden"
                      onSubmit={(e) => { handleAddTask(e); e.target.blur(); }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        placeholder="What needs to be done?"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="bg-transparent font-sans text-[13px] font-medium placeholder-text-secondary/30 focus:outline-none w-full"
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
                            className="flex flex-col gap-2 overflow-hidden"
                          >
                            <input
                              type="text"
                              placeholder="Add a note..."
                              value={taskNote}
                              onChange={(e) => setTaskNote(e.target.value)}
                              className="bg-transparent text-[11px] text-text-secondary/60 placeholder-text-secondary/20 focus:outline-none w-full mt-0.5"
                            />

                            <div className="flex flex-wrap gap-x-3 gap-y-2 items-center pt-2 border-t border-text-primary/5">
                              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-2">
                                <span className="text-[9px] text-text-secondary/40 font-semibold uppercase tracking-widest mr-1 shrink-0">Subj</span>
                                <button type="button" onClick={() => setTaskSubjectId('')} className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all ${!taskSubjectId ? 'border-text-primary/30 bg-text-primary/5 text-text-primary' : 'border-transparent text-text-secondary/50 hover:bg-text-primary/5 hover:text-text-primary'}`}>
                                  <div className="w-2 h-2 rounded-full bg-text-primary/20" />
                                  <span className="text-[10px] font-medium">None</span>
                                </button>
                                {state.subjects.map(s => (
                                  <button key={s.id} type="button" onClick={() => setTaskSubjectId(s.id)} className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-all ${taskSubjectId === s.id ? 'border-text-primary/30 bg-text-primary/5 text-text-primary' : 'border-transparent text-text-secondary/50 hover:bg-text-primary/5 hover:text-text-primary'}`}>
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.accentColor }} />
                                    <span className="text-[10px] font-medium">{s.name}</span>
                                  </button>
                                ))}
                              </div>
                              {/* Priority Picker removed */}
                            </div>
                            <div className="flex justify-end gap-1.5 pt-1.5 mt-1">
                              <button onClick={() => setIsAdding(false)} className="px-2 py-1 rounded text-[11px] font-medium text-text-secondary/50" type="button">Cancel</button>
                              <button type="submit" className="px-3 py-1 rounded text-[11px] bg-text-primary text-background-main font-semibold">Add Task</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.form>
                  )}
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-1.5 pointer-events-auto">
                <AnimatePresence initial={false}>
                  {activeTodos.map(todo => {
                    const sub = state.subjects.find(s => s.id === todo.subject_id);
                    const accentColor = sub?.accentColor || 'var(--border-glass-bright)';
                    const isCompleting = completingIds.includes(todo.id);
                    const borderColor = hexToRgba(accentColor, 0.75);

                    return (
                      <motion.div
                        key={todo.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`task-chip group !min-h-[32px] !py-1.5 !px-2.5 !mb-1 !rounded-md !gap-2 bg-text-primary/[0.03] border border-text-primary/[0.08] ${isCompleting ? 'opacity-50 pointer-events-none' : ''}`}
                        style={{ borderLeft: `4px solid ${borderColor}` }}
                      >
                        <div className="task-chip-dot" style={{ backgroundColor: accentColor }} />
                        <div className="flex-grow min-w-0 flex flex-col opacity-90">
                          <span className="task-title font-sans text-[12px] font-medium truncate">{todo.title}</span>
                          {todo.note && <span className="text-[10px] text-text-secondary/50 truncate">{todo.note}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {todo.recurrence_days?.length > 0 && <span className="text-[9px] opacity-40 font-mono">↻ {formatRecurrence(todo.recurrence_days)}</span>}
                          {todo.deadline && !todo.recurrence_days && <span className="text-[9px] opacity-40 font-mono">{formatTodoDeadline(todo.deadline)}</span>}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleComplete(todo); }}
                            className={`relative w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-200 ${isCompleting ? 'border-accent bg-accent' : 'border-text-primary/20'}`}
                            type="button"
                          >
                            {isCompleting && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {activeTodos.length === 0 && !isAdding && (
                <div className="flex flex-col items-center justify-center py-6 text-center opacity-40">
                  <span className="font-serif italic text-[13px]">Nothing for this day.</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
