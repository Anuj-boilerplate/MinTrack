export default function CompletedTrail({ doneTodos, onUncomplete, label }) {
  if (doneTodos.length === 0) return null;

  const headerLabel = label || `${doneTodos.length} Completed`;

  return (
    <div className="mt-6">
      <div className="done-trail-divider">
        <span className="font-semibold text-[10px] tracking-wider">
          {headerLabel}
        </span>
        <div className="h-[1px] bg-text-primary/10 flex-grow" />
      </div>

      <div className="space-y-2 opacity-50">
        {doneTodos.map(todo => (
          <div
            key={todo.id}
            className="task-chip scratched bg-text-primary/[0.03] border border-text-primary/[0.08]"
          >
            <div className="flex-grow min-w-0 flex flex-col">
              <span className="task-title font-sans text-[15px] truncate flex items-center gap-1.5">
                {todo.title}
                {todo.recurrence_days && todo.recurrence_days.length > 0 && (
                  <span className="text-[14px] text-accent font-bold" title="Recurring task">↻</span>
                )}
              </span>
              {todo.note && (
                <span className="text-[12px] md:text-[12px] text-text-secondary/40 truncate">
                  {todo.note}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onUncomplete(todo.id)}
                className="w-5 h-5 rounded-full border border-accent flex items-center justify-center bg-accent/10"
                type="button"
                title="Mark incomplete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}