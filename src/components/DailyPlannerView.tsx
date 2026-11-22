import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  DailyHabitItem,
  DailyHighlightItem,
  DailyPlannerState,
  DailyTaskItem,
} from '../types/workspace';
import { uid } from '../lib/googleWorkspaceApi';

interface DailyPlannerViewProps {
  userId: string;
  fullWidth?: boolean;
  onToggleFullWidth?: () => void;
}

const DEFAULT_TAGS = ['Work', 'Personal'];

const LEGACY_SEEDED_NOTE_PREFIX = 'Morning Focus:\n- Finalize top 3 outcomes for today';

export type TagColorKey =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange';

interface TagColorTheme {
  key: TagColorKey;
  label: string;
  swatchClass: string;
  badgeClass: string;
  activeFilterClass: string;
  inactiveFilterClass: string;
}

const TAG_COLOR_PALETTE: TagColorTheme[] = [
  {
    key: 'blue',
    label: 'Blue',
    swatchClass: 'bg-blue-500',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/70',
    activeFilterClass:
      'bg-blue-600 text-white shadow-xs dark:bg-blue-500 dark:text-white',
    inactiveFilterClass:
      'bg-blue-50/80 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50',
  },
  {
    key: 'emerald',
    label: 'Green',
    swatchClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    activeFilterClass:
      'bg-emerald-600 text-white shadow-xs dark:bg-emerald-500 dark:text-white',
    inactiveFilterClass:
      'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
  },
  {
    key: 'violet',
    label: 'Purple',
    swatchClass: 'bg-violet-500',
    badgeClass:
      'bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/70',
    activeFilterClass:
      'bg-violet-600 text-white shadow-xs dark:bg-violet-500 dark:text-white',
    inactiveFilterClass:
      'bg-violet-50/80 text-violet-700 hover:bg-violet-100/80 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50',
  },
  {
    key: 'amber',
    label: 'Amber',
    swatchClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    activeFilterClass:
      'bg-amber-600 text-white shadow-xs dark:bg-amber-500 dark:text-white',
    inactiveFilterClass:
      'bg-amber-50/80 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50',
  },
  {
    key: 'rose',
    label: 'Pink',
    swatchClass: 'bg-rose-500',
    badgeClass:
      'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/70',
    activeFilterClass:
      'bg-rose-600 text-white shadow-xs dark:bg-rose-500 dark:text-white',
    inactiveFilterClass:
      'bg-rose-50/80 text-rose-700 hover:bg-rose-100/80 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50',
  },
  {
    key: 'cyan',
    label: 'Teal',
    swatchClass: 'bg-cyan-500',
    badgeClass:
      'bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800/70',
    activeFilterClass:
      'bg-cyan-600 text-white shadow-xs dark:bg-cyan-500 dark:text-white',
    inactiveFilterClass:
      'bg-cyan-50/80 text-cyan-700 hover:bg-cyan-100/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-900/50',
  },
  {
    key: 'orange',
    label: 'Orange',
    swatchClass: 'bg-orange-500',
    badgeClass:
      'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/70',
    activeFilterClass:
      'bg-orange-600 text-white shadow-xs dark:bg-orange-500 dark:text-white',
    inactiveFilterClass:
      'bg-orange-50/80 text-orange-700 hover:bg-orange-100/80 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-900/50',
  },
];

function getTagColorTheme(
  tag: string,
  tagColors?: Record<string, string>
): TagColorTheme {
  const lower = tag.toLowerCase();
  const explicitKey =
    tagColors?.[tag] ||
    (lower === 'work'
      ? 'blue'
      : lower === 'personal'
      ? 'emerald'
      : lower === 'focus' || lower === 'deep work'
      ? 'violet'
      : lower === 'health'
      ? 'rose'
      : lower === 'errands'
      ? 'amber'
      : null);

  if (explicitKey) {
    const found = TAG_COLOR_PALETTE.find((c) => c.key === explicitKey);
    if (found) return found;
  }

  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return TAG_COLOR_PALETTE[hash % TAG_COLOR_PALETTE.length];
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(dateKey: string, delta: number): string {
  const dt = parseDateKey(dateKey);
  dt.setDate(dt.getDate() + delta);
  return toDateKey(dt);
}

function formatFullDate(dateKey: string): string {
  const dt = parseDateKey(dateKey);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortDate(dateKey: string): string {
  const dt = parseDateKey(dateKey);
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function calculateHabitStreak(
  completedDates: Record<string, boolean>,
  referenceDateKey: string
): number {
  let streak = 0;
  let cursor = referenceDateKey;
  if (!completedDates[cursor]) {
    const yesterday = addDays(referenceDateKey, -1);
    if (!completedDates[yesterday]) {
      return 0;
    }
    cursor = yesterday;
  }
  while (completedDates[cursor]) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function sanitizeLegacyNotes(
  notesMap: Record<string, string> | undefined
): Record<string, string> {
  if (!notesMap) return {};
  const cleaned: Record<string, string> = {};
  for (const [k, val] of Object.entries(notesMap)) {
    if (typeof val === 'string' && val.trim().startsWith(LEGACY_SEEDED_NOTE_PREFIX)) {
      cleaned[k] = '';
    } else {
      cleaned[k] = val;
    }
  }
  return cleaned;
}

function createInitialPlannerState(todayKey: string): DailyPlannerState {
  const yesterdayKey = addDays(todayKey, -1);

  return {
    customTags: ['Focus'],
    tagColors: {
      Work: 'blue',
      Personal: 'emerald',
      Focus: 'violet',
    },
    tasksByDate: {
      [todayKey]: [
        {
          id: uid('dtask'),
          date: todayKey,
          title: 'Review today’s key priorities',
          completed: true,
          starred: true,
          tag: 'Work',
          createdAt: new Date().toISOString(),
        },
        {
          id: uid('dtask'),
          date: todayKey,
          title: 'Complete deep work session',
          completed: false,
          starred: false,
          tag: 'Focus',
          createdAt: new Date().toISOString(),
        },
        {
          id: uid('dtask'),
          date: todayKey,
          title: 'Evening walk & recharge',
          completed: false,
          starred: false,
          tag: 'Personal',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    notesByDate: {},
    ideasByDate: {},
    highlightsByDate: {},
    habits: [
      {
        id: uid('habit'),
        title: 'Plan top 3 priorities',
        category: 'Work',
        completedDates: {
          [yesterdayKey]: true,
          [todayKey]: true,
        },
        starredDates: {},
      },
      {
        id: uid('habit'),
        title: '90m deep focus block',
        category: 'Work',
        completedDates: {
          [yesterdayKey]: true,
        },
        starredDates: {},
      },
      {
        id: uid('habit'),
        title: '30m movement / walk',
        category: 'Personal',
        completedDates: {
          [yesterdayKey]: true,
          [todayKey]: true,
        },
        starredDates: {},
      },
      {
        id: uid('habit'),
        title: 'Read 20 pages',
        category: 'Personal',
        completedDates: {},
        starredDates: {},
      },
    ],
  };
}

export interface StarredEntry {
  id: string;
  dateKey: string;
  kind: 'task' | 'habit' | 'realization';
  title: string;
  tagOrSub?: string;
  completed?: boolean;
  sourceId: string;
}

export const DailyPlannerView: React.FC<DailyPlannerViewProps> = ({
  userId,
  fullWidth = false,
  onToggleFullWidth,
}) => {
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const storageKey = `folio_daily_planner_v1_${userId || 'local'}`;

  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [visibleMonth, setVisibleMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [planner, setPlanner] = useState<DailyPlannerState>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyPlannerState;
        if (parsed && typeof parsed === 'object' && parsed.tasksByDate && parsed.habits) {
          return {
            tasksByDate: parsed.tasksByDate || {},
            notesByDate: sanitizeLegacyNotes(parsed.notesByDate),
            ideasByDate: parsed.ideasByDate || {},
            highlightsByDate: parsed.highlightsByDate || {},
            habits: parsed.habits || [],
            customTags: parsed.customTags || ['Focus'],
            tagColors: parsed.tagColors || {
              Work: 'blue',
              Personal: 'emerald',
              Focus: 'violet',
            },
          };
        }
      }
    } catch {
      // Fallback to default state
    }
    return createInitialPlannerState(todayKey);
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(planner));
    } catch {
      // Ignore quota errors
    }
  }, [planner, storageKey]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTag, setNewTaskTag] = useState<string>('Work');
  const [newTaskStarred, setNewTaskStarred] = useState<boolean>(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string>('All');

  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [customTagDraft, setCustomTagDraft] = useState('');
  const [customTagColor, setCustomTagColor] = useState<TagColorKey>('violet');

  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [showNewHabitInput, setShowNewHabitInput] = useState(false);

  const [newHighlightText, setNewHighlightText] = useState('');
  const [showAllStarredList, setShowAllStarredList] = useState(false);
  const [starredListScope, setStarredListScope] = useState<'all' | 'selected'>('all');

  const allTags = useMemo(() => {
    const merged = [...DEFAULT_TAGS];
    for (const t of planner.customTags) {
      if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) {
        merged.push(t);
      }
    }
    return merged;
  }, [planner.customTags]);

  const tasksForSelectedDate = useMemo(
    () => planner.tasksByDate[selectedDate] || [],
    [planner.tasksByDate, selectedDate]
  );

  const highlightsForSelectedDate = useMemo(
    () => (planner.highlightsByDate || {})[selectedDate] || [],
    [planner.highlightsByDate, selectedDate]
  );

  const filteredTasks = useMemo(() => {
    if (activeTagFilter === 'All') return tasksForSelectedDate;
    if (activeTagFilter === '__starred__') {
      return tasksForSelectedDate.filter((t) => Boolean(t.starred));
    }
    return tasksForSelectedDate.filter(
      (t) => t.tag.toLowerCase() === activeTagFilter.toLowerCase()
    );
  }, [tasksForSelectedDate, activeTagFilter]);

  const notesForSelectedDate = planner.notesByDate[selectedDate] || '';
  const ideasForSelectedDate = (planner.ideasByDate || {})[selectedDate] || '';

  const completedTasksCount = useMemo(
    () => tasksForSelectedDate.filter((t) => t.completed).length,
    [tasksForSelectedDate]
  );

  const completedHabitsCount = useMemo(
    () => planner.habits.filter((h) => Boolean(h.completedDates[selectedDate])).length,
    [planner.habits, selectedDate]
  );

  // Aggregate all starred items across all dates (tasks, habits, realizations)
  const allStarredEntries = useMemo<StarredEntry[]>(() => {
    const list: StarredEntry[] = [];

    // 1. Starred tasks across all dates
    for (const [dateKey, tasks] of Object.entries(planner.tasksByDate)) {
      for (const t of tasks || []) {
        if (t.starred) {
          list.push({
            id: `task_${t.id}`,
            dateKey,
            kind: 'task',
            title: t.title,
            tagOrSub: t.tag,
            completed: t.completed,
            sourceId: t.id,
          });
        }
      }
    }

    // 2. Starred habits on specific dates
    for (const h of planner.habits) {
      for (const [dateKey, isStarred] of Object.entries(h.starredDates || {})) {
        if (isStarred) {
          list.push({
            id: `habit_${h.id}_${dateKey}`,
            dateKey,
            kind: 'habit',
            title: h.title,
            tagOrSub: 'Habit',
            completed: Boolean(h.completedDates[dateKey]),
            sourceId: h.id,
          });
        }
      }
    }

    // 3. Starred realizations / highlights
    for (const [dateKey, highlights] of Object.entries(
      planner.highlightsByDate || {}
    )) {
      for (const hl of highlights || []) {
        list.push({
          id: `hl_${hl.id}`,
          dateKey,
          kind: 'realization',
          title: hl.text,
          tagOrSub: 'Realization',
          completed: true,
          sourceId: hl.id,
        });
      }
    }

    return list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [planner.tasksByDate, planner.habits, planner.highlightsByDate]);

  // Fast lookup map of dateKey -> number of starred items on that day
  const starredCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of allStarredEntries) {
      map[entry.dateKey] = (map[entry.dateKey] || 0) + 1;
    }
    return map;
  }, [allStarredEntries]);

  const selectedDateStarredEntries = useMemo(
    () => allStarredEntries.filter((e) => e.dateKey === selectedDate),
    [allStarredEntries, selectedDate]
  );

  const displayedStarredEntries =
    starredListScope === 'selected' ? selectedDateStarredEntries : allStarredEntries;

  const calendarDays = useMemo(() => {
    const { year, month } = visibleMonth;
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateKey: string;
      dayNumber: number;
      inCurrentMonth: boolean;
    }> = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const dt = new Date(year, month - 1, d);
      cells.push({
        dateKey: toDateKey(dt),
        dayNumber: d,
        inCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      cells.push({
        dateKey: toDateKey(dt),
        dayNumber: d,
        inCurrentMonth: true,
      });
    }

    const totalNeeded = cells.length > 35 ? 42 : 35;
    let nextMonthDay = 1;
    while (cells.length < totalNeeded) {
      const dt = new Date(year, month + 1, nextMonthDay++);
      cells.push({
        dateKey: toDateKey(dt),
        dayNumber: dt.getDate(),
        inCurrentMonth: false,
      });
    }

    return cells;
  }, [visibleMonth]);

  const monthLabel = useMemo(() => {
    const dt = new Date(visibleMonth.year, visibleMonth.month, 1);
    return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [visibleMonth]);

  const selectDateAndSyncMonth = (dateKey: string) => {
    setSelectedDate(dateKey);
    const dt = parseDateKey(dateKey);
    setVisibleMonth({ year: dt.getFullYear(), month: dt.getMonth() });
  };

  const navigateMonth = (delta: number) => {
    setVisibleMonth((prev) => {
      const dt = new Date(prev.year, prev.month + delta, 1);
      return { year: dt.getFullYear(), month: dt.getMonth() };
    });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newTaskTitle.trim();
    if (!cleanTitle) return;

    const item: DailyTaskItem = {
      id: uid('dtask'),
      date: selectedDate,
      title: cleanTitle,
      completed: false,
      starred: newTaskStarred,
      tag: newTaskTag || 'Work',
      createdAt: new Date().toISOString(),
    };

    setPlanner((prev) => ({
      ...prev,
      tasksByDate: {
        ...prev.tasksByDate,
        [selectedDate]: [...(prev.tasksByDate[selectedDate] || []), item],
      },
    }));
    setNewTaskTitle('');
    setNewTaskStarred(false);
  };

  const toggleTaskCompleted = (taskId: string) => {
    setPlanner((prev) => ({
      ...prev,
      tasksByDate: {
        ...prev.tasksByDate,
        [selectedDate]: (prev.tasksByDate[selectedDate] || []).map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        ),
      },
    }));
  };

  const toggleTaskStarred = (taskId: string, dateKey = selectedDate) => {
    setPlanner((prev) => ({
      ...prev,
      tasksByDate: {
        ...prev.tasksByDate,
        [dateKey]: (prev.tasksByDate[dateKey] || []).map((t) =>
          t.id === taskId ? { ...t, starred: !t.starred } : t
        ),
      },
    }));
  };

  const updateTask = (taskId: string, patch: Partial<DailyTaskItem>) => {
    setPlanner((prev) => ({
      ...prev,
      tasksByDate: {
        ...prev.tasksByDate,
        [selectedDate]: (prev.tasksByDate[selectedDate] || []).map((t) =>
          t.id === taskId ? { ...t, ...patch } : t
        ),
      },
    }));
  };

  const deleteTask = (taskId: string) => {
    setPlanner((prev) => ({
      ...prev,
      tasksByDate: {
        ...prev.tasksByDate,
        [selectedDate]: (prev.tasksByDate[selectedDate] || []).filter(
          (t) => t.id !== taskId
        ),
      },
    }));
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagDraft.trim();
    if (!clean) return;
    const exists = allTags.some((t) => t.toLowerCase() === clean.toLowerCase());
    setPlanner((prev) => ({
      ...prev,
      customTags: exists ? prev.customTags : [...prev.customTags, clean],
      tagColors: {
        ...(prev.tagColors || {}),
        [clean]: customTagColor,
      },
    }));
    setNewTaskTag(clean);
    setCustomTagDraft('');
    setShowCustomTagInput(false);
  };

  const handleRemoveCustomTag = (tagToRemove: string) => {
    if (DEFAULT_TAGS.includes(tagToRemove)) return;
    setPlanner((prev) => ({
      ...prev,
      customTags: prev.customTags.filter((t) => t !== tagToRemove),
    }));
    if (newTaskTag === tagToRemove) setNewTaskTag('Work');
    if (activeTagFilter === tagToRemove) setActiveTagFilter('All');
  };

  const toggleHabitOnDate = (habitId: string, dateKey: string) => {
    setPlanner((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const nextDates = { ...h.completedDates };
        if (nextDates[dateKey]) {
          delete nextDates[dateKey];
        } else {
          nextDates[dateKey] = true;
        }
        return { ...h, completedDates: nextDates };
      }),
    }));
  };

  const toggleHabitStarredOnDate = (habitId: string, dateKey: string) => {
    setPlanner((prev) => ({
      ...prev,
      habits: prev.habits.map((h) => {
        if (h.id !== habitId) return h;
        const nextStarred = { ...(h.starredDates || {}) };
        if (nextStarred[dateKey]) {
          delete nextStarred[dateKey];
        } else {
          nextStarred[dateKey] = true;
        }
        return { ...h, starredDates: nextStarred };
      }),
    }));
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newHabitTitle.trim();
    if (!clean) return;
    const newHabit: DailyHabitItem = {
      id: uid('habit'),
      title: clean,
      category: 'Daily',
      completedDates: {},
      starredDates: {},
    };
    setPlanner((prev) => ({
      ...prev,
      habits: [...prev.habits, newHabit],
    }));
    setNewHabitTitle('');
    setShowNewHabitInput(false);
  };

  const deleteHabit = (habitId: string) => {
    setPlanner((prev) => ({
      ...prev,
      habits: prev.habits.filter((h) => h.id !== habitId),
    }));
  };

  const handleAddHighlight = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newHighlightText.trim();
    if (!clean) return;
    const item: DailyHighlightItem = {
      id: uid('hl'),
      date: selectedDate,
      text: clean,
      createdAt: new Date().toISOString(),
    };
    setPlanner((prev) => ({
      ...prev,
      highlightsByDate: {
        ...(prev.highlightsByDate || {}),
        [selectedDate]: [
          ...((prev.highlightsByDate || {})[selectedDate] || []),
          item,
        ],
      },
    }));
    setNewHighlightText('');
  };

  const removeHighlight = (highlightId: string, dateKey: string) => {
    setPlanner((prev) => ({
      ...prev,
      highlightsByDate: {
        ...(prev.highlightsByDate || {}),
        [dateKey]: ((prev.highlightsByDate || {})[dateKey] || []).filter(
          (h) => h.id !== highlightId
        ),
      },
    }));
  };

  const handleUnstarEntry = (entry: StarredEntry) => {
    if (entry.kind === 'task') {
      toggleTaskStarred(entry.sourceId, entry.dateKey);
    } else if (entry.kind === 'habit') {
      toggleHabitStarredOnDate(entry.sourceId, entry.dateKey);
    } else if (entry.kind === 'realization') {
      removeHighlight(entry.sourceId, entry.dateKey);
    }
  };

  const handleNotesChange = (value: string) => {
    setPlanner((prev) => ({
      ...prev,
      notesByDate: {
        ...prev.notesByDate,
        [selectedDate]: value,
      },
    }));
  };

  const handleIdeasChange = (value: string) => {
    setPlanner((prev) => ({
      ...prev,
      ideasByDate: {
        ...(prev.ideasByDate || {}),
        [selectedDate]: value,
      },
    }));
  };

  const selectedNewTaskTheme = getTagColorTheme(newTaskTag, planner.tagColors);
  const selectedDayHasStar = Boolean(starredCountByDate[selectedDate]);

  return (
    <div
      className={
        fullWidth
          ? 'w-full max-w-none px-4 py-8 sm:px-6'
          : 'mx-auto max-w-[1040px] px-6 py-8 lg:px-10'
      }
    >
      {/* Minimal Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-neutral-200/80 pb-5 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-3xl">
              {formatFullDate(selectedDate)}
            </h1>
            {selectedDayHasStar && (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-300"
                title="This day has starred important items or realizations"
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                <span className="tabular-nums">
                  {starredCountByDate[selectedDate]} starred
                </span>
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {selectedDate === todayKey ? 'Today' : selectedDate} · Local planner (not synced with Google Calendar)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Toggle All Starred / Important List */}
          <button
            type="button"
            onClick={() => setShowAllStarredList((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              showAllStarredList
                ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-200'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800'
            }`}
            title="View list of all starred tasks, habits, and realizations"
          >
            <Star
              className={`h-3.5 w-3.5 ${
                allStarredEntries.length > 0
                  ? 'fill-amber-400 text-amber-500'
                  : 'text-neutral-400'
              }`}
            />
            <span>Important & Starred</span>
            <span className="rounded bg-amber-100/80 px-1.5 py-0.2 font-mono text-[11px] tabular-nums text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              {allStarredEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectDateAndSyncMonth(addDays(selectedDate, -1))}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Previous day"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => selectDateAndSyncMonth(todayKey)}
            disabled={selectedDate === todayKey}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 disabled:opacity-40 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => selectDateAndSyncMonth(addDays(selectedDate, 1))}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Next day"
          >
            Next
          </button>
          {onToggleFullWidth && (
            <button
              type="button"
              onClick={onToggleFullWidth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 whitespace-nowrap shrink-0"
              title={
                fullWidth
                  ? 'Switch to centered canvas width'
                  : 'Expand canvas width edge to edge'
              }
              aria-label="Toggle edge-to-edge full width"
            >
              {fullWidth ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span>{fullWidth ? 'Standard Width' : 'Full Width'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Starred & Important List Drawer across All Days */}
      <AnimatePresence initial={false}>
        {showAllStarredList && (
          <motion.section
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mt-6 rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Important Realizations, Tasks & Habits
                </h2>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  · Click any item to jump to that date on the calendar
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs dark:border-neutral-800 dark:bg-[#191918]">
                  <button
                    type="button"
                    onClick={() => setStarredListScope('all')}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      starredListScope === 'all'
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                    }`}
                  >
                    All Dates ({allStarredEntries.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStarredListScope('selected')}
                    className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                      starredListScope === 'selected'
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                        : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                    }`}
                  >
                    {formatShortDate(selectedDate)} ({selectedDateStarredEntries.length})
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllStarredList(false)}
                  className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label="Close starred list"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Add Realization / Milestone for Selected Date */}
            <form onSubmit={handleAddHighlight} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newHighlightText}
                onChange={(e) => setNewHighlightText(e.target.value)}
                placeholder={`Star something you realized or achieved on ${formatShortDate(selectedDate)}...`}
                className="flex-1 rounded-lg border border-amber-200/90 bg-white px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-amber-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 whitespace-nowrap shrink-0"
              >
                <Star className="h-3 w-3 fill-white" />
                <span>Add Starred Note</span>
              </button>
            </form>

            {displayedStarredEntries.length === 0 ? (
              <p className="py-5 text-center text-xs text-neutral-500 dark:text-neutral-400">
                No starred items yet. Click the ★ icon next to any task or habit—or add a realization above—to mark it on the calendar.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {displayedStarredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => selectDateAndSyncMonth(entry.dateKey)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectDateAndSyncMonth(entry.dateKey);
                      }
                    }}
                    className={`group flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border bg-white px-3 py-2 text-left transition-colors hover:border-amber-300 dark:bg-[#191918] ${
                      entry.dateKey === selectedDate
                        ? 'border-amber-300/90 dark:border-amber-700/70'
                        : 'border-neutral-200/80 dark:border-neutral-800'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
                          {entry.title}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                          <span className="font-mono tabular-nums text-amber-700 dark:text-amber-400">
                            {formatShortDate(entry.dateKey)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{entry.kind}</span>
                          {entry.tagOrSub && entry.kind === 'task' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{entry.tagOrSub}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstarEntry(entry);
                      }}
                      className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-neutral-800"
                      title="Remove star"
                      aria-label="Remove star"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Calm Two-Column Workspace */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Calendar + Daily Habits directly below the Calendar */}
        <div className="space-y-6 lg:col-span-4">
          {/* 1. Calendar Card */}
          <div className="rounded-xl border border-neutral-200/90 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {monthLabel}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] text-neutral-400 dark:text-neutral-500">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-0.5">
              {calendarDays.map((cell) => {
                const isSelected = cell.dateKey === selectedDate;
                const isToday = cell.dateKey === todayKey;
                const starCount = starredCountByDate[cell.dateKey] || 0;
                const hasStar = starCount > 0;
                const hasActivity =
                  (planner.tasksByDate[cell.dateKey]?.length || 0) > 0 ||
                  Boolean(planner.notesByDate[cell.dateKey]?.trim()) ||
                  Boolean((planner.ideasByDate || {})[cell.dateKey]?.trim()) ||
                  planner.habits.some((h) => Boolean(h.completedDates[cell.dateKey]));

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => selectDateAndSyncMonth(cell.dateKey)}
                    title={
                      hasStar
                        ? `${cell.dateKey} · ${starCount} starred item${starCount > 1 ? 's' : ''}`
                        : cell.dateKey
                    }
                    className={`relative flex h-9 flex-col items-center justify-center rounded-md font-mono text-xs tabular-nums transition-colors ${
                      isSelected
                        ? 'bg-neutral-900 font-semibold text-white dark:bg-blue-600'
                        : isToday
                        ? 'font-semibold text-blue-600 dark:text-blue-400'
                        : cell.inCurrentMonth
                        ? 'text-neutral-700 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        : 'text-neutral-400/70 dark:text-neutral-600'
                    }`}
                  >
                    {/* Small Star on Calendar Cell when day has important/starred item */}
                    {hasStar && (
                      <Star
                        className={`absolute right-0.5 top-0.5 h-2.5 w-2.5 ${
                          isSelected
                            ? 'fill-amber-300 text-amber-300'
                            : 'fill-amber-400 text-amber-500'
                        }`}
                      />
                    )}
                    <span>{cell.dayNumber}</span>
                    {hasActivity && (
                      <span
                        className={`mt-0.5 h-1 w-1 rounded-full ${
                          hasStar
                            ? isSelected
                              ? 'bg-amber-300'
                              : 'bg-amber-500'
                            : isSelected
                            ? 'bg-white'
                            : 'bg-neutral-400 dark:bg-neutral-500'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quiet 1-line Summary with Starred Count */}
            <div className="mt-4 flex items-center justify-between border-t border-neutral-200/80 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <span className="tabular-nums">
                {completedTasksCount}/{tasksForSelectedDate.length} tasks
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {completedHabitsCount}/{planner.habits.length} habits
              </span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setShowAllStarredList((v) => !v)}
                className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                <span className="tabular-nums">{allStarredEntries.length} starred</span>
              </button>
            </div>
          </div>

          {/* 2. Daily Habit Tracker (Positioned directly below the Calendar) */}
          <section className="rounded-xl border border-neutral-200/90 bg-white p-4 dark:border-neutral-800 dark:bg-[#20201E]">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Daily Habits
                </h2>
                <span className="font-mono text-xs tabular-nums text-neutral-400">
                  {completedHabitsCount}/{planner.habits.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewHabitInput((prev) => !prev)}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add habit</span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showNewHabitInput && (
                <motion.form
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onSubmit={handleAddHabit}
                  className="mt-3 flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    autoFocus
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                    placeholder="New daily habit..."
                    className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewHabitInput(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                    aria-label="Cancel adding habit"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-3 space-y-1.5">
              {planner.habits.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">
                  No habits yet. Click &ldquo;Add habit&rdquo; to track daily checkmarks.
                </p>
              ) : (
                planner.habits.map((habit) => {
                  const isChecked = Boolean(habit.completedDates[selectedDate]);
                  const isStarredToday = Boolean(
                    (habit.starredDates || {})[selectedDate]
                  );
                  const streak = calculateHabitStreak(
                    habit.completedDates,
                    selectedDate
                  );

                  return (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabitOnDate(habit.id, selectedDate)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleHabitOnDate(habit.id, selectedDate);
                        }
                      }}
                      className={`group flex cursor-pointer items-center justify-between gap-2.5 rounded-lg border px-3 py-2 transition-colors ${
                        isChecked
                          ? 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                          : 'border-neutral-200/80 bg-[#F8F8F7]/60 hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-[#191918]/60 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isChecked
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[2.5]" />}
                        </span>
                        <span
                          className={`truncate text-xs font-medium ${
                            isChecked
                              ? 'text-neutral-400 line-through dark:text-neutral-500'
                              : 'text-neutral-800 dark:text-neutral-100'
                          }`}
                        >
                          {habit.title}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        {streak > 0 && (
                          <span className="font-mono text-[11px] tabular-nums text-emerald-700 dark:text-emerald-400">
                            {streak}d
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHabitStarredOnDate(habit.id, selectedDate);
                          }}
                          className={`rounded p-0.5 transition-opacity ${
                            isStarredToday
                              ? 'text-amber-500 opacity-100'
                              : 'text-neutral-400 opacity-0 hover:text-amber-500 group-hover:opacity-100'
                          }`}
                          title={
                            isStarredToday
                              ? 'Starred as important today (click to unstar)'
                              : 'Star this habit for today'
                          }
                          aria-label={`Star ${habit.title}`}
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isStarredToday ? 'fill-amber-400 text-amber-500' : ''
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHabit(habit.id);
                          }}
                          className="rounded p-0.5 text-neutral-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                          title="Remove habit"
                          aria-label={`Remove ${habit.title}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 3. Starred Realizations & Highlights on Selected Day (Compact Card below Habits) */}
          <section className="rounded-xl border border-neutral-200/90 bg-white p-4 dark:border-neutral-800 dark:bg-[#20201E]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Realized / Important
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAllStarredList(true)}
                className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                View all ({allStarredEntries.length})
              </button>
            </div>

            <form onSubmit={handleAddHighlight} className="mt-2.5 flex items-center gap-1.5">
              <input
                type="text"
                value={newHighlightText}
                onChange={(e) => setNewHighlightText(e.target.value)}
                placeholder="Star a realization or win for today..."
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-amber-400 focus:bg-white dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
              />
              <button
                type="submit"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                title="Star and save"
              >
                <Star className="h-3.5 w-3.5 fill-white" />
              </button>
            </form>

            {selectedDateStarredEntries.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {selectedDateStarredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-center justify-between gap-2 rounded-lg border border-amber-200/70 bg-amber-50/40 px-2.5 py-1.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
                      <span className="truncate font-medium text-neutral-800 dark:text-neutral-100">
                        {entry.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnstarEntry(entry)}
                      className="rounded p-0.5 text-neutral-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                      title="Unstar"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Daily Tasks + Separate Daily Notes & Ideas Sections */}
        <div className="space-y-8 lg:col-span-8">
          {/* 1. DAILY TASKS */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Daily Tasks
                </h2>
                <span className="font-mono text-xs tabular-nums text-neutral-400">
                  {completedTasksCount}/{tasksForSelectedDate.length}
                </span>
              </div>

              {/* Colored Tag Filter Tabs + Starred Filter + Icon-Only [+] Button */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTagFilter('All')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTagFilter === 'All'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveTagFilter((curr) =>
                      curr === '__starred__' ? 'All' : '__starred__'
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeTagFilter === '__starred__'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-amber-50/80 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                  }`}
                  title="Filter to starred important tasks"
                >
                  <Star
                    className={`h-3 w-3 ${
                      activeTagFilter === '__starred__'
                        ? 'fill-white text-white'
                        : 'fill-amber-400 text-amber-500'
                    }`}
                  />
                  <span>Starred</span>
                </button>
                {allTags.map((tagOption) => {
                  const active = activeTagFilter === tagOption;
                  const isCustom = !DEFAULT_TAGS.includes(tagOption);
                  const theme = getTagColorTheme(tagOption, planner.tagColors);
                  return (
                    <div key={tagOption} className="group/tag relative inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setActiveTagFilter(tagOption)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active ? theme.activeFilterClass : theme.inactiveFilterClass
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active ? 'bg-white' : theme.swatchClass
                          }`}
                        />
                        <span>{tagOption}</span>
                      </button>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomTag(tagOption)}
                          className="ml-0.5 hidden rounded p-0.5 text-neutral-400 hover:text-red-600 group-hover/tag:inline-flex"
                          title={`Delete tag ${tagOption}`}
                          aria-label={`Delete tag ${tagOption}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowCustomTagInput((prev) => !prev)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-neutral-300 text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 shrink-0"
                  title="Add custom tag"
                  aria-label="Add custom tag"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Tag Creator with Color Swatches */}
            <AnimatePresence initial={false}>
              {showCustomTagInput && (
                <motion.form
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  onSubmit={handleAddCustomTag}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-[#F8F8F7] p-2.5 dark:border-neutral-800 dark:bg-[#20201E]"
                >
                  <input
                    type="text"
                    autoFocus
                    value={customTagDraft}
                    onChange={(e) => setCustomTagDraft(e.target.value)}
                    placeholder="New tag name (e.g. Health, Study, Errands)..."
                    className="min-w-[180px] flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
                  />
                  <div className="flex items-center gap-1 px-1">
                    {TAG_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setCustomTagColor(c.key)}
                        title={c.label}
                        aria-label={`Select ${c.label} tag color`}
                        className={`h-5 w-5 rounded-full transition-transform ${
                          c.swatchClass
                        } ${
                          customTagColor === c.key
                            ? 'scale-110 ring-2 ring-neutral-900 ring-offset-1 dark:ring-white dark:ring-offset-[#20201E]'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 whitespace-nowrap shrink-0"
                  >
                    Save Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomTagInput(false)}
                    className="p-1 text-neutral-400 hover:text-neutral-700"
                    aria-label="Close custom tag input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Simple Single-Line Task Input with Star Toggle & Colored Tag Selector */}
            <form onSubmit={handleAddTask} className="flex items-center gap-2">
              <div className="relative flex flex-1 items-center">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Add a task and press Enter..."
                  className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] py-2 pl-3.5 pr-9 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-100"
                />
                <button
                  type="button"
                  onClick={() => setNewTaskStarred((s) => !s)}
                  className="absolute right-2.5 rounded p-1 text-neutral-400 hover:text-amber-500"
                  title={
                    newTaskStarred
                      ? 'Marked as important (★ on calendar)'
                      : 'Mark as important (★ on calendar)'
                  }
                >
                  <Star
                    className={`h-4 w-4 ${
                      newTaskStarred ? 'fill-amber-400 text-amber-500' : ''
                    }`}
                  />
                </button>
              </div>
              <select
                value={newTaskTag}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setShowCustomTagInput(true);
                  } else {
                    setNewTaskTag(e.target.value);
                  }
                }}
                aria-label="Task tag"
                className={`rounded-lg border px-3 py-2 text-xs font-medium outline-none transition-colors ${selectedNewTaskTheme.badgeClass}`}
              >
                {allTags.map((t) => (
                  <option
                    key={t}
                    value={t}
                    className="bg-white text-neutral-900 dark:bg-[#20201E] dark:text-neutral-100"
                  >
                    {t}
                  </option>
                ))}
                <option
                  value="__custom__"
                  className="bg-white text-neutral-900 dark:bg-[#20201E] dark:text-neutral-100"
                >
                  + Custom...
                </option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                Add
              </button>
            </form>

            {/* Clean Task Rows with Star Button & Colored Tag Selector */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
              {filteredTasks.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-400">
                  No tasks for this view yet.
                </p>
              ) : (
                filteredTasks.map((task) => {
                  const tagTheme = getTagColorTheme(task.tag, planner.tagColors);
                  return (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between gap-3 py-2.5"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTaskCompleted(task.id)}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            task.completed
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-neutral-300 bg-white hover:border-neutral-500 dark:border-neutral-600 dark:bg-transparent'
                          }`}
                          aria-label={`Toggle "${task.title}"`}
                        >
                          {task.completed && <Check className="h-3 w-3 stroke-[2.5]" />}
                        </button>
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) =>
                            updateTask(task.id, { title: e.target.value })
                          }
                          className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
                            task.completed
                              ? 'text-neutral-400 line-through dark:text-neutral-500'
                              : 'text-neutral-800 dark:text-neutral-100'
                          }`}
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleTaskStarred(task.id)}
                          className={`rounded p-1 transition-opacity ${
                            task.starred
                              ? 'text-amber-500 opacity-100'
                              : 'text-neutral-400 opacity-0 hover:text-amber-500 group-hover:opacity-100'
                          }`}
                          title={
                            task.starred
                              ? 'Important / Starred (appears on calendar)'
                              : 'Mark as important (★ on calendar)'
                          }
                          aria-label="Star task"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              task.starred ? 'fill-amber-400 text-amber-500' : ''
                            }`}
                          />
                        </button>
                        <select
                          value={task.tag}
                          onChange={(e) =>
                            updateTask(task.id, { tag: e.target.value })
                          }
                          aria-label="Change tag"
                          className={`cursor-pointer rounded-md border px-2 py-0.5 text-xs font-medium outline-none transition-colors ${tagTheme.badgeClass}`}
                        >
                          {allTags.map((t) => (
                            <option
                              key={t}
                              value={t}
                              className="bg-white text-neutral-900 dark:bg-[#20201E] dark:text-neutral-100"
                            >
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                          aria-label="Delete task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 2. SEPARATE SECTIONS FOR DAILY NOTES AND IDEAS */}
          <div className="grid grid-cols-1 gap-6 border-t border-neutral-200/80 pt-8 dark:border-neutral-800 md:grid-cols-2">
            {/* Daily Notes Section (Empty by default) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Daily Notes
                </h2>
                <span className="text-xs text-neutral-400">
                  {selectedDate}
                </span>
              </div>

              <textarea
                rows={7}
                value={notesForSelectedDate}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Write your daily notes..."
                className="w-full resize-y rounded-xl border border-neutral-200/90 bg-[#F8F8F7] p-4 text-sm leading-relaxed text-neutral-800 outline-none transition-colors focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-100"
              />
            </section>

            {/* Ideas Section (Empty by default) */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Ideas
                </h2>
                <span className="text-xs text-neutral-400">
                  Scratchpad
                </span>
              </div>

              <textarea
                rows={7}
                value={ideasForSelectedDate}
                onChange={(e) => handleIdeasChange(e.target.value)}
                placeholder="Jot down new ideas, sparks, or next steps..."
                className="w-full resize-y rounded-xl border border-neutral-200/90 bg-[#F8F8F7] p-4 text-sm leading-relaxed text-neutral-800 outline-none transition-colors focus:border-neutral-400 focus:bg-white dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-100"
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
