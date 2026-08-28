import { motion, AnimatePresence } from 'framer-motion';
import { formatHoursToMins, hexToRgba } from '../../utils';

function isManualSession(startISO, endISO) {
  if (!startISO) return true;
  const start = new Date(startISO);
  if (isNaN(start.getTime())) return true;
  // Midnight check in local or UTC indicates an untimed/manual date log
  const isLocalMidnight = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
  const isUTCMidnight = start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && start.getUTCSeconds() === 0;
  return isLocalMidnight || isUTCMidnight;
}

function formatSessionSubtitle(startISO, endISO) {
  const start = new Date(startISO);
  if (isNaN(start.getTime())) return '';
  const datePart = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (isManualSession(startISO, endISO)) {
    return `${datePart} \u00B7 Manually logged`;
  }

  const end = new Date(endISO);
  const fmt = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isNaN(end.getTime())) return datePart;
  return `${datePart} \u00B7 ${fmt(start)}\u2013${fmt(end)}`;
}

export default function SessionHistoryModal({ subjects, onClose, onDeleteSession }) {
  const allSessions = [];
  for (const subject of subjects) {
    const sessions = subject.sessions || [];
    for (const s of sessions) {
      if (s.is_discarded) continue;
      allSessions.push({
        ...s,
        subjectName: subject.name,
        accentColor: subject.accentColor || subject.accent_color || '#c97b6e',
        subjectId: subject.id,
      });
    }
  }
  allSessions.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

  return (
    <motion.div
      className="modal-backdrop"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="modal-pane max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.82, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 6 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
      >
        <div className="flex justify-between items-center w-full border-b border-text-primary/10 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <h2 className="modal-heading m-0 text-[14px] font-semibold tracking-[0.14em] uppercase">Session History</h2>
            {allSessions.length > 0 && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-text-primary/10 text-text-secondary/70">
                {allSessions.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-text-primary hover:bg-text-primary/5 transition-colors focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {allSessions.length === 0 ? (
          <p className="text-center text-sm text-text-secondary/60 py-8">No sessions recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2.5 overflow-y-auto pr-1.5 -mr-1 custom-scrollbar min-h-0 flex-1 py-1" style={{ maxHeight: '60vh' }}>
            <AnimatePresence initial={false}>
              {allSessions.map((session) => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-text-primary/5 relative overflow-hidden shrink-0 min-h-[52px]"
                  style={{ backgroundColor: hexToRgba(session.accentColor, 0.06) }}
                >
                  {/* Left color strip */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
                    style={{ backgroundColor: session.accentColor }}
                  />

                  {/* Content */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 pl-1">
                    <span
                      className="text-[12px] font-semibold truncate"
                      style={{ color: session.accentColor }}
                    >
                      {session.subjectName}
                    </span>
                    <span className="text-[11px] text-text-secondary/60">
                      {formatSessionSubtitle(session.start_time, session.end_time)}
                    </span>
                  </div>

                  {/* Duration badge */}
                  <span
                    className="text-[12px] font-mono font-medium shrink-0 px-2 py-0.5 rounded-md bg-text-primary/[0.04]"
                    style={{ color: session.accentColor }}
                  >
                    {formatHoursToMins((session.duration_minutes || 0) / 60)}
                  </span>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.subjectId, session.id)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary/40 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0 focus:outline-none ml-0.5"
                    aria-label="Delete session"
                    title="Delete this session"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
