import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TaskForm({ onSubmit, onCancel, activeDateStr }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [deadline, setDeadline] = useState('');
  const [recurrence, setRecurrence] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    e.target.blur?.();
    document.activeElement?.blur?.();
    onSubmit(
      title.trim(),
      note.trim(),
      deadline || null,
      recurrence.length > 0 ? recurrence : null
    );
  };

  return (
    <motion.form
      data-active-date={activeDateStr}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="p-4 rounded-xl border border-text-primary/10 bg-text-primary/[0.02] flex flex-col gap-3 overflow-hidden"
    >
      <input
        type="text"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="bg-transparent font-sans text-[16px] md:text-[16px] font-medium placeholder-text-secondary/30 focus:outline-none w-full"
        autoFocus
        required
      />

      <AnimatePresence>
        {title.length > 0 && (
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-transparent text-[13px] text-text-secondary/60 placeholder-text-secondary/20 focus:outline-none w-full mt-1"
            />

            <div className="flex flex-wrap items-center pt-3 border-t border-text-primary/5">
              <div className="flex items-center ml-auto">
                <span className="text-[10px] text-text-secondary/40 font-semibold uppercase tracking-widest mr-2">Deadline</span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="bg-text-primary/5 border border-text-primary/5 rounded-lg px-2 py-1 text-[11px] text-text-secondary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-text-primary/5">
              <span className="text-[10px] text-text-secondary/40 font-semibold uppercase tracking-widest">Repeat</span>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((dayChar, i) => {
                  const dayVal = i === 6 ? 0 : i + 1;
                  const isSelected = recurrence.includes(dayVal);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setRecurrence(recurrence.filter(d => d !== dayVal));
                        } else {
                          setRecurrence([...recurrence, dayVal]);
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

            <div className="flex justify-end gap-2 pt-2 mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-secondary/50 hover:text-text-primary transition-colors"
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
  );
}