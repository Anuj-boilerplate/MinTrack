import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStateContext } from '../../contexts/StateContext';
import { parseTaskInput } from '../../utils/nlpParser';
import { parseDateAsLocal } from '../../utils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TaskForm({ onSubmit, onCancel, activeDateStr }) {
  const { smartTaskInput } = useStateContext();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [deadline, setDeadline] = useState('');
  const [recurrence, setRecurrence] = useState([]);
  const [dismissedPhrase, setDismissedPhrase] = useState(null);

  // NLP parsing for natural language date/recurrence
  const referenceDate = useMemo(() => {
    return activeDateStr ? parseDateAsLocal(activeDateStr) : new Date();
  }, [activeDateStr]);

  const nlpResult = useMemo(() => {
    if (!smartTaskInput || !title.trim()) {
      return { hasMatch: false, type: null, cleanTitle: title, displayLabel: '', scheduledDate: null, recurrenceDays: null, matchedText: '' };
    }
    return parseTaskInput(title, referenceDate);
  }, [smartTaskInput, title, referenceDate]);

  const isNlpActive = smartTaskInput && nlpResult.hasMatch && dismissedPhrase !== nlpResult.matchedText;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    e.target.blur?.();
    document.activeElement?.blur?.();

    let finalTitle = title.trim();
    let finalRecurrence = recurrence.length > 0 ? recurrence : null;
    let finalTargetDate = null;

    if (isNlpActive) {
      finalTitle = nlpResult.cleanTitle || title.trim();
      if (nlpResult.type === 'recurrence') {
        finalRecurrence = nlpResult.recurrenceDays;
        finalTargetDate = null;
      } else if (nlpResult.type === 'date') {
        finalTargetDate = nlpResult.scheduledDate;
      }
    }

    onSubmit(
      finalTitle,
      note.trim(),
      deadline || null,
      finalRecurrence,
      finalTargetDate
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
        onChange={(e) => {
          setTitle(e.target.value);
          if (!e.target.value.trim() && dismissedPhrase) {
            setDismissedPhrase(null);
          }
        }}
        className="bg-transparent font-sans text-[16px] md:text-[16px] font-medium placeholder-text-secondary/30 focus:outline-none w-full"
        autoFocus
        required
      />

      {/* Smart Date / Recurrence Confirmation Chip */}
      <AnimatePresence>
        {isNlpActive && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg text-[11px] font-medium bg-text-primary/10 border border-text-primary/15 text-text-primary/90 shadow-sm"
          >
            {nlpResult.type === 'recurrence' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent flex-shrink-0">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-accent flex-shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            )}
            <span>{nlpResult.displayLabel}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissedPhrase(nlpResult.matchedText);
              }}
              className="ml-1 -mr-0.5 p-0.5 rounded hover:bg-text-primary/10 text-text-secondary/40 hover:text-text-primary transition-colors"
              title="Don't parse date (keep as raw title)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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