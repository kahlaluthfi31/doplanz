export function getTaskDeadlineStart(dueDate) {
  const start = new Date(dueDate);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getTaskDeadlineEnd(todo) {
  const dueDate = new Date(todo.dueDate);
  if (todo.dueTime && todo.isAllDay !== true) {
    const [hours, minutes] = todo.dueTime.split(':').map(Number);
    dueDate.setHours(Number.isNaN(hours) ? 23 : hours, Number.isNaN(minutes) ? 59 : minutes, 0, 0);
    return dueDate;
  }
  const end = new Date(dueDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function isTaskInProgress(todo, now = new Date()) {
  if (todo.isCompleted) return false;
  if (!todo.dueDate) return false;
  return now >= getTaskDeadlineStart(todo.dueDate);
}

export function getTaskDeadlineProgress(todo, now = new Date()) {
  if (!todo.dueDate) return 0;
  const start = getTaskDeadlineStart(todo.dueDate);
  const end = getTaskDeadlineEnd(todo);
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
}
