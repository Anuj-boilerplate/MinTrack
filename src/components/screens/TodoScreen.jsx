import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { motion, AnimatePresence } from 'framer-motion';

// Helper to convert hex to rgba
function hexToRgba(hex, opacity) {
  if (!hex) return `rgba(255, 255, 255, ${opacity})`;
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

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

const getDefaultColorHex = (index) => {
  return ACCENT_COLORS[index % ACCENT_COLORS.length].hex;
};

// Date Formatter Helper (e.g. MAY 20)
function formatTodoDeadline(dateStr) {
  if (!dateStr) return '';
  // Handle standard YYYY-MM-DD or ISO
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export default function TodoScreen() {
  const {
    state,
    addTodo,
    toggleTodoCompleted,
    toggleTodoScheduled,
    deleteTodo,
    setSubjectAccentColor
  } = useStateContext();

  const [activePicker, setActivePicker] = useState(null); // ID of subject with open color picker
  const [addingTaskForSub, setAddingTaskForSub] = useState(null); // ID of subject adding task
  
  // Task inputs
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('low');

  const handleAddTaskSubmit = async (subId) => {
    if (!newTaskName.trim()) return;
    await addTodo(subId, newTaskName.trim(), newTaskNote.trim(), newTaskDeadline || null, newTaskPriority);
    // Reset inputs
    setNewTaskName('');
    setNewTaskNote('');
    setNewTaskDeadline('');
    setNewTaskPriority('low');
    setAddingTaskForSub(null);
  };

  // Keyboard navigation for addition
  const handleKeyDown = (e, subId) => {
    if (e.key === 'Enter') {
      handleAddTaskSubmit(subId);
    } else if (e.key === 'Escape') {
      setAddingTaskForSub(null);
    }
  };

  // Empty state rendering details per card index
  const getEmptyStateContent = (index, subName) => {
    const lowercaseName = subName.toLowerCase();
    if (lowercaseName.includes('internship') || index === 0) {
      return {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        ),
        text1: "No tasks for today.",
        text2: "Enjoy the calm. You've earned it."
      };
    } else if (lowercaseName.includes('leetcode') || index === 1) {
      return {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        ),
        text1: "No tasks for today.",
        text2: "Enjoy the calm. You've earned it."
      };
    } else if (lowercaseName.includes('subject 3') || index === 2) {
      return {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9 12 2"></polygon>
          </svg>
        ),
        text1: "No tasks for today.",
        text2: "A blank page is part of the process."
      };
    } else if (lowercaseName.includes('subject 4') || index === 3) {
      return {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8a7 7 0 0 1-9 8.2Z"></path>
            <path d="M19 2c-2.26 4.33-5.27 7.14-8 10"></path>
          </svg>
        ),
        text1: "No tasks for today.",
        text2: "Let the mind wander. Ideas need space."
      };
    } else {
      return {
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/20">
            <path d="M2 12c4-4 8-4 12 0s8 4 12 0"></path>
            <path d="M2 17c4-4 8-4 12 0s8 4 12 0"></path>
          </svg>
        ),
        text1: "No tasks for today.",
        text2: "Take a breath. Clarity comes in quiet."
      };
    }
  };

  return (
    <div id="todo-screen" className="dashboard-shell px-8 py-10 md:px-12 md:py-12 min-h-screen text-text-primary select-none animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]">
      <div
        style={{
          columns: '420px',
          columnGap: '2rem',
          width: '100%'
        }}
      >
        {state.subjects.map((sub, index) => {
          const accentColor = sub.accentColor || '#c97b6e';
          const cardTodos = state.todos.filter(t => t.subject_id === sub.id);
          const todayTodos = cardTodos.filter(t => t.scheduled_for_today);
          const backlogTodos = cardTodos.filter(t => !t.scheduled_for_today);
          
          const isPickerOpen = activePicker === sub.id;
          const isAddingTask = addingTaskForSub === sub.id;

          // Priority rule opacity mapping
          const getPriorityOpacity = (priority) => {
            if (priority === 'high') return 'opacity-100';
            if (priority === 'medium') return 'opacity-60';
            return 'opacity-30';
          };

          return (
            <div
              key={sub.id}
              style={{ breakInside: 'avoid', marginBottom: '2rem', display: 'inline-block', width: '100%' }}
            >
              <div
                className="flex flex-col rounded-[12px] p-[28px] transition-all duration-300"
                style={{
                  backgroundColor: '#1a1a1a',
                  backgroundImage: `linear-gradient(${hexToRgba(accentColor, 0.04)}, ${hexToRgba(accentColor, 0.04)})`,
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
              <div className="flex flex-col w-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                  <h2 
                    className="font-serif text-[34px] font-normal leading-tight select-text"
                    style={{ color: accentColor }}
                  >
                    {sub.name.trim()}
                  </h2>
                  <button
                    onClick={() => setActivePicker(isPickerOpen ? null : sub.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
                    type="button"
                    title="Choose accent color"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="19" cy="12" r="1"></circle>
                      <circle cx="5" cy="12" r="1"></circle>
                    </svg>
                  </button>
                </div>

                {/* Color Picker Inline Section */}
                <AnimatePresence mode="wait">
                  {isPickerOpen ? (
                    <motion.div
                      key="color-picker"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col w-full py-4"
                    >
                      <div className="flex justify-between items-center mb-5 text-[13px] text-white/60">
                        <span>Choose your accent color</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.35483 19.5 5.5 20 5.5 20.5C5.5 21.3284 6.17157 22 7 22H12Z"></path>
                          <circle cx="7.5" cy="10.5" r="1.5"></circle>
                          <circle cx="11.5" cy="7.5" r="1.5"></circle>
                          <circle cx="16.5" cy="9.5" r="1.5"></circle>
                          <circle cx="15.5" cy="14.5" r="1.5"></circle>
                        </svg>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-6">
                        {ACCENT_COLORS.map((color) => {
                          const isSelected = accentColor === color.hex;
                          return (
                            <button
                              key={color.name}
                              onClick={() => {
                                setSubjectAccentColor(sub.id, color.hex);
                                setActivePicker(null);
                              }}
                              className="flex flex-col items-center group focus:outline-none"
                              type="button"
                            >
                              <div
                                className="w-12 h-12 rounded-[8px] relative flex items-center justify-center transition-transform group-hover:scale-105"
                                style={{ backgroundColor: color.hex }}
                              >
                                {isSelected && (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                )}
                              </div>
                              <span className="text-[10px] text-white/40 mt-1 text-center truncate w-full group-hover:text-white/60">
                                {color.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[11px] text-white/40 text-center">
                        This will update the look of your goal.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tasks-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col w-full"
                    >
                      {/* TODAY Section */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span 
                            className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
                            style={{ color: hexToRgba(accentColor, 0.7) }}
                          >
                            TODAY
                          </span>
                        </div>
                        <div 
                          className="h-[1px] w-full mb-4" 
                          style={{ backgroundColor: hexToRgba(accentColor, 0.15) }}
                        />

                        {todayTodos.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <div className="mb-3">
                              {getEmptyStateContent(index, sub.name).icon}
                            </div>
                            <p className="font-serif italic text-[15px] text-white/35 leading-relaxed">
                              {getEmptyStateContent(index, sub.name).text1}
                            </p>
                            <p className="font-serif italic text-[15px] text-white/35 leading-relaxed">
                              {getEmptyStateContent(index, sub.name).text2}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            <AnimatePresence initial={false}>
                              {todayTodos.map((todo) => (
                                <motion.div
                                  key={todo.id}
                                  layoutId={todo.id}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className={`flex items-start justify-between group py-1 ${todo.is_completed ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {/* Priority left rule */}
                                    <div 
                                      className={`w-[3px] h-[34px] rounded-full self-stretch ${getPriorityOpacity(todo.priority)}`}
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    {/* Checkbox */}
                                    <button
                                      onClick={() => toggleTodoCompleted(todo.id)}
                                      className="w-5 h-5 rounded-[4px] border border-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors focus:outline-none"
                                      style={{
                                        backgroundColor: todo.is_completed ? accentColor : 'transparent',
                                        borderColor: todo.is_completed ? accentColor : 'rgba(255,255,255,0.2)'
                                      }}
                                      type="button"
                                    >
                                      {todo.is_completed && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16120e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                      )}
                                    </button>
                                    <div className="flex flex-col min-w-0">
                                      <span 
                                        className={`font-sans text-[15px] font-normal leading-normal truncate ${todo.is_completed ? 'line-through text-white/40' : 'text-white/85'}`}
                                      >
                                        {todo.title}
                                      </span>
                                      {todo.note && (
                                        <span className="font-sans text-[13px] text-white/40 leading-normal truncate">
                                          {todo.note}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    {todo.deadline && (
                                      <span className="font-mono text-[12px] text-white/35 mt-1 self-start">
                                        {formatTodoDeadline(todo.deadline)}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => deleteTodo(todo.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400/70 focus:outline-none p-0.5"
                                      type="button"
                                      title="Delete task"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* BACKLOG Section */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span 
                            className="font-sans text-[10px] font-semibold tracking-[0.15em] uppercase"
                            style={{ color: hexToRgba(accentColor, 0.7) }}
                          >
                            BACKLOG
                          </span>
                        </div>
                        <div 
                          className="h-[1px] w-full mb-4" 
                          style={{ backgroundColor: hexToRgba(accentColor, 0.15) }}
                        />

                        {backlogTodos.length === 0 && !isAddingTask ? (
                          <div className="py-2 text-center">
                            {/* Empty state for Backlog just silent empty space */}
                          </div>
                        ) : (
                          <div className="space-y-3.5 mb-4">
                            <AnimatePresence initial={false}>
                              {backlogTodos.map((todo) => (
                                <motion.div
                                  key={todo.id}
                                  layoutId={todo.id}
                                  initial={{ opacity: 0, y: -5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className="flex items-start justify-between group py-1 text-white/55"
                                >
                                  <div className="flex items-start gap-3 flex-1 min-w-0">
                                    {/* Priority left rule */}
                                    <div 
                                      className={`w-[3px] h-[34px] rounded-full self-stretch ${getPriorityOpacity(todo.priority)}`}
                                      style={{ backgroundColor: accentColor }}
                                    />
                                    {/* Checkbox (Disabled in backlog) */}
                                    <div className="w-5 h-5 rounded-[4px] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 opacity-50 cursor-not-allowed bg-transparent" />
                                    
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-sans text-[15px] font-normal leading-normal truncate">
                                        {todo.title}
                                      </span>
                                      {todo.note && (
                                        <span className="font-sans text-[13px] text-white/40 leading-normal truncate">
                                          {todo.note}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    {/* Hover Today Button */}
                                    <button
                                      onClick={() => toggleTodoScheduled(todo.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-0.5 rounded text-[11px] text-white/70 hover:text-white"
                                      type="button"
                                    >
                                      → Today
                                    </button>

                                    {todo.deadline && (
                                      <span className="font-mono text-[12px] text-white/35 self-start">
                                        {formatTodoDeadline(todo.deadline)}
                                      </span>
                                    )}

                                    <button
                                      onClick={() => deleteTodo(todo.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400/70 focus:outline-none p-0.5"
                                      type="button"
                                      title="Delete task"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                      </svg>
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Inline Task Creation Form */}
                        {isAddingTask ? (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-black/20 border border-white/5 rounded-[8px] p-4 space-y-3 mb-4"
                          >
                            <input
                              type="text"
                              placeholder="Task name..."
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, sub.id)}
                              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-white/30"
                              autoFocus
                            />
                            <input
                              type="text"
                              placeholder="Note..."
                              value={newTaskNote}
                              onChange={(e) => setNewTaskNote(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, sub.id)}
                              className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-[13px] text-white/70 placeholder-white/20 focus:outline-none focus:border-white/30"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="date"
                                value={newTaskDeadline}
                                onChange={(e) => setNewTaskDeadline(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white/70 focus:outline-none focus:border-white/30 w-full"
                              />
                              <select
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-white/70 focus:outline-none focus:border-white/30 w-full"
                              >
                                <option value="low" className="bg-[#1a1a1a]">Low Priority</option>
                                <option value="medium" className="bg-[#1a1a1a]">Medium Priority</option>
                                <option value="high" className="bg-[#1a1a1a]">High Priority</option>
                              </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-1 text-[12px]">
                              <button
                                onClick={() => setAddingTaskForSub(null)}
                                className="px-3 py-1 text-white/50 hover:text-white/80"
                                type="button"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAddTaskSubmit(sub.id)}
                                className="px-3 py-1 rounded text-white font-medium hover:brightness-115 transition-all"
                                style={{ backgroundColor: accentColor }}
                                type="button"
                              >
                                Add Task
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingTaskForSub(sub.id);
                              setNewTaskName('');
                              setNewTaskNote('');
                              setNewTaskDeadline('');
                              setNewTaskPriority('low');
                            }}
                            className="text-[13px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 focus:outline-none"
                            type="button"
                          >
                            <span>+ Add task</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
