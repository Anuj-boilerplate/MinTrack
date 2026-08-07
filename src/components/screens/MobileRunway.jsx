import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation, AnimatePresence } from 'framer-motion';
import { getDateForOffset, getTodosForDate } from '../../utils/todoHelpers';
import TaskChip from '../todo/TaskChip';
import TaskForm from '../todo/TaskForm';
import CompletedTrail from '../todo/CompletedTrail';

export default function MobileRunway({
  activeDateStr,
  setActiveDateStr,
  state,
  isAdding,
  setIsAdding,
  completingIds,
  handleComplete,
  handleAddTask,
  isJumpNavigating,
  deleteTodo,
  updateTodoTitle,
  moveTodoToDate,
  toggleTodoCompleted,
  toggleTodoScratched,
  className
}) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);
  const [pendingDelete, setPendingDelete] = useState(null);
  const pendingDeleteTimer = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => () => {
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
  }, []);

  const handleDeleteRequest = (id) => {
    const todo = state.todos.find(t => t.id === id);
    if (!todo) return;
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    pendingDeleteTimer.current = setTimeout(() => {
      deleteTodo(id);
      setPendingDelete(cur => cur?.id === id ? null : cur);
    }, 4000);
    setPendingDelete({ id, todo });
  };

  const handleUndoDelete = () => {
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    pendingDeleteTimer.current = null;
    setPendingDelete(null);
  };

  const handleUncomplete = (todoId) => {
    const todo = state.todos.find(t => t.id === todoId);
    if (todo?.recurrence_days?.length > 0) toggleTodoScratched(todoId);
    else toggleTodoCompleted(todoId);
  };

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
          const activeTodos = dayTodos.filter(t => t.recurrence_days?.length ? !t.is_scratched_today : !t.is_completed).filter(t => t.id !== pendingDelete?.id);

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

          const activeTodos = dayTodos.filter(t => t.recurrence_days?.length ? !t.is_scratched_today : !t.is_completed).filter(t => t.id !== pendingDelete?.id);
          const doneTodos = dayTodos.filter(t => t.recurrence_days?.length ? t.is_scratched_today : t.is_completed).filter(t => t.id !== pendingDelete?.id);

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
                    <TaskForm onSubmit={handleAddTask} onCancel={() => setIsAdding(false)} activeDateStr={dateStr} />
                  )}
                </div>
              )}

              {/* Tasks List */}
              <div className="space-y-1.5 pointer-events-auto">
                <AnimatePresence initial={false}>
                  {activeTodos.map(todo => (
                    <TaskChip
                      key={todo.id}
                      todo={todo}
                      onComplete={handleComplete}
                      onDelete={handleDeleteRequest}
                      onUpdateTitle={updateTodoTitle}
                      onMoveTo={moveTodoToDate}
                      isCompleting={completingIds.includes(todo.id)}
                      isMobile
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Completed Trail */}
              {doneTodos.length > 0 && (
                <CompletedTrail
                  doneTodos={doneTodos}
                  onUncomplete={handleUncomplete}
                  label={activeTodos.length === 0 ? 'All done ✦' : `${doneTodos.length} Completed`}
                />
              )}

              {activeTodos.length === 0 && !isAdding && !pendingDelete && (
                <div className="flex flex-col items-center justify-center py-6 text-center opacity-40">
                  <span className="font-serif italic text-[13px]">Nothing for this day.</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Undo Delete Toast */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-full bg-background-glass border border-text-primary/10 shadow-lg text-[12px]"
          >
            <span className="text-text-primary/80">Task deleted</span>
            <button className="text-accent font-semibold" onClick={handleUndoDelete}>Undo</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}