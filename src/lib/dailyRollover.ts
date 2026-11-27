import { DailyTaskItem } from '../types/workspace';

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getNextDateKey(dateKey: string): string {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + 1);
  return toLocalDateKey(dt);
}

/**
 * Automatically moves any uncompleted daily tasks from past dates (< todayKey)
 * forward to the next day (up to todayKey) so unfinished tasks are never left behind.
 */
export function rolloverPastUncompletedDailyTasks(
  tasksByDate: Record<string, DailyTaskItem[]>,
  todayKey: string
): {
  tasksByDate: Record<string, DailyTaskItem[]>;
  rolledCount: number;
} {
  let rolledCount = 0;
  const nextMap: Record<string, DailyTaskItem[]> = {};
  const carriedToToday: DailyTaskItem[] = [];

  const sortedDateKeys = Object.keys(tasksByDate).sort();

  for (const dateKey of sortedDateKeys) {
    const list = tasksByDate[dateKey];
    if (!Array.isArray(list) || list.length === 0) continue;

    if (dateKey < todayKey) {
      const completedOnDay: DailyTaskItem[] = [];
      for (const task of list) {
        if (task.completed) {
          completedOnDay.push(task);
        } else {
          rolledCount += 1;
          carriedToToday.push({
            ...task,
            date: todayKey,
            rolledOverFrom: task.rolledOverFrom || dateKey,
          });
        }
      }
      if (completedOnDay.length > 0) {
        nextMap[dateKey] = completedOnDay;
      }
    } else {
      nextMap[dateKey] = [...list];
    }
  }

  if (carriedToToday.length > 0) {
    const existingToday = nextMap[todayKey] || [];
    const existingIds = new Set(existingToday.map((t) => t.id));
    const dedupedCarried = carriedToToday.filter((t) => !existingIds.has(t.id));
    nextMap[todayKey] = [...dedupedCarried, ...existingToday];
  }

  return {
    tasksByDate: rolledCount > 0 ? nextMap : tasksByDate,
    rolledCount,
  };
}

/**
 * Moves all uncompleted tasks on `fromDateKey` to the immediate next calendar day.
 */
export function moveUncompletedTasksToNextDay(
  tasksByDate: Record<string, DailyTaskItem[]>,
  fromDateKey: string
): {
  tasksByDate: Record<string, DailyTaskItem[]>;
  movedCount: number;
  targetDateKey: string;
} {
  const targetDateKey = getNextDateKey(fromDateKey);
  const currentList = tasksByDate[fromDateKey] || [];
  const uncompleted = currentList.filter((t) => !t.completed);
  if (uncompleted.length === 0) {
    return { tasksByDate, movedCount: 0, targetDateKey };
  }

  const remaining = currentList.filter((t) => t.completed);
  const targetList = tasksByDate[targetDateKey] || [];
  const existingTargetIds = new Set(targetList.map((t) => t.id));

  const movedItems: DailyTaskItem[] = uncompleted
    .filter((t) => !existingTargetIds.has(t.id))
    .map((t) => ({
      ...t,
      date: targetDateKey,
      rolledOverFrom: t.rolledOverFrom || fromDateKey,
    }));

  const nextMap: Record<string, DailyTaskItem[]> = {
    ...tasksByDate,
    [targetDateKey]: [...movedItems, ...targetList],
  };

  if (remaining.length > 0) {
    nextMap[fromDateKey] = remaining;
  } else {
    delete nextMap[fromDateKey];
  }

  return {
    tasksByDate: nextMap,
    movedCount: movedItems.length,
    targetDateKey,
  };
}

/**
 * Moves a single task on `fromDateKey` to the immediate next calendar day.
 */
export function moveSingleTaskToNextDay(
  tasksByDate: Record<string, DailyTaskItem[]>,
  fromDateKey: string,
  taskId: string
): {
  tasksByDate: Record<string, DailyTaskItem[]>;
  targetDateKey: string;
  moved: boolean;
} {
  const targetDateKey = getNextDateKey(fromDateKey);
  const currentList = tasksByDate[fromDateKey] || [];
  const taskToMove = currentList.find((t) => t.id === taskId);
  if (!taskToMove) {
    return { tasksByDate, targetDateKey, moved: false };
  }

  const remaining = currentList.filter((t) => t.id !== taskId);
  const targetList = tasksByDate[targetDateKey] || [];
  const movedTask: DailyTaskItem = {
    ...taskToMove,
    date: targetDateKey,
    rolledOverFrom: taskToMove.rolledOverFrom || fromDateKey,
  };

  const nextMap: Record<string, DailyTaskItem[]> = {
    ...tasksByDate,
    [targetDateKey]: [
      movedTask,
      ...targetList.filter((t) => t.id !== taskId),
    ],
  };

  if (remaining.length > 0) {
    nextMap[fromDateKey] = remaining;
  } else {
    delete nextMap[fromDateKey];
  }

  return {
    tasksByDate: nextMap,
    targetDateKey,
    moved: true,
  };
}
