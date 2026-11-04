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
              <p className="panel-description">Small steps add up.</p>
            </div>
            <button type="button" className="text-action" onClick={() => setIsAddingTask(value => !value)}>
              {isAddingTask ? 'Cancel' : 'Add task'}
            </button>
          </div>

          {isAddingTask && (
            <div className="today-task-entry">
              <TaskForm
                onSubmit={handleAddTask}
                onCancel={() => setIsAddingTask(false)}
                activeDateStr={today}
              />
            </div>
          )}

          {todaysTasks.length > 0 ? (
            <div className="today-task-list">
              {todaysTasks.slice(0, 8).map(task => (
                <label className={`today-task${task.is_completed ? ' is-complete' : ''}`} key={task.id}>
                  <input type="checkbox" checked={Boolean(task.is_completed)} onChange={() => toggleTodoCompleted(task.id)} />
                  <span>{task.title}</span>
                </label>
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
