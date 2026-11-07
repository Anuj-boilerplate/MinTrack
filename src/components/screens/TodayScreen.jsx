import { useMemo, useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { toLocalDateString } from '../../utils';
import { getTodosForDate } from '../../utils/todoHelpers';
import TaskForm from '../todo/TaskForm';
import TodayProgressCard from './TodayProgressCard';

export default function TodayScreen({ navigate }) {
  const { state, addTodo, toggleTodoCompleted } = useStateContext();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const today = toLocalDateString();
  const todaysTasks = useMemo(() => getTodosForDate(state.todos || [], today), [state.todos, today]);

  const handleAddTask = async (title, note, deadline, recurrenceDays, targetDateOverride = null) => {
    const createdId = await addTodo(
      title.trim(),
      note.trim(),
      deadline || null,
      targetDateOverride || today,
      recurrenceDays?.length ? recurrenceDays : null
    );
    if (!createdId) return false;
    setIsAddingTask(false);
    return true;
  };

  return (
    <section className="page-content today-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="page-title">Today</h1>
          <p className="page-description">A clear plan for your next study session.</p>
        </div>
        <button className="primary-action" type="button" onClick={() => navigate(state.activeSession ? '/timer' : '/goals')}>
          {state.activeSession ? 'Open timer' : 'Start studying'}
        </button>
      </div>

      <TodayProgressCard subjects={state.subjects} onGoalClick={goalId => navigate(`/timer/setup?goal=${goalId}`)} />

      <div className="today-columns">
        <section className="content-panel">
          <div className="panel-heading-row">
            <div>
              <h2 className="section-title">Today&rsquo;s plan</h2>
              <p className="panel-description">Check the box when you finish a task.</p>
            </div>
            <button
              type="button"
              className={`today-add-task${isAddingTask ? ' is-cancel' : ''}`}
              aria-expanded={isAddingTask}
              aria-controls="today-task-form"
              onClick={() => setIsAddingTask(value => !value)}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d={isAddingTask ? 'M5 5l10 10M15 5 5 15' : 'M10 3v14M3 10h14'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              <span>{isAddingTask ? 'Cancel' : 'Add a task'}</span>
            </button>
          </div>

          <div className="today-task-entry" id="today-task-form" hidden={!isAddingTask}>
            {isAddingTask && (
              <TaskForm
                onSubmit={handleAddTask}
                onCancel={() => setIsAddingTask(false)}
                activeDateStr={today}
              />
            )}
          </div>

          {todaysTasks.length > 0 ? (
            <div className="today-task-list">
              {todaysTasks.slice(0, 8).map(task => (
                <div className={`today-task${task.is_completed ? ' is-complete' : ''}`} key={task.id}>
                  <span className="today-task-title">{task.title}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(task.is_completed)}
                    aria-label={task.is_completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                    onChange={() => toggleTodoCompleted(task.id)}
                  />
                </div>
              ))}
            </div>
          ) : !isAddingTask ? (
            <div className="inline-empty"><p>No tasks planned for today.</p></div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
