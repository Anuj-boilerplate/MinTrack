export function hexToRgba(hex, opacity) {
  if (!hex) return `rgba(255, 255, 255, ${opacity})`;
  if (hex.startsWith('var(')) {
    return `color-mix(in srgb, ${hex} ${opacity * 100}%, transparent)`;
  }
  const num = parseInt(hex.replace('#', ''), 16);
  if (isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function formatTodoDeadline(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export function formatRecurrence(days) {
  if (!days || days.length === 0) return '';
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.map(d => WEEKDAYS_SHORT[d]).join(' ');
}

export function getDateForOffset(offset, pivot = new Date()) {
  const d = new Date(pivot);
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export function getTodosForDate(todos, dateStr) {
  const dow = new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
  return todos.filter(todo => {
    if (todo.recurrence_days && todo.recurrence_days.length > 0) {
      return todo.recurrence_days.includes(dow);
    }
    const actualTodayStr = new Date().toISOString().split('T')[0];
    const isToday = dateStr === actualTodayStr;
    if (isToday) {
      if (!todo.is_completed && todo.scheduled_date && todo.scheduled_date < dateStr) {
        return true;
      }
    }
    return todo.scheduled_date === dateStr;
  });
}
