import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Eye,
  FileText,
  Kanban,
  ListChecks,
  Plus,
  Search,
} from 'lucide-react';
import {
  DailyPlannerState,
  DailyTaskItem,
  ProjectWorkspace,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/workspace';
import { uid } from '../lib/googleWorkspaceApi';
import {
  TaskTagColorKey,
  getTaskTagColorTheme,
  loadCustomTagColors,
  parseTaskTags,
} from '../lib/tagColors';
import {
  getNextDateKey,
  moveSingleTaskToNextDay,
  moveUncompletedTasksToNextDay,
  rolloverPastUncompletedDailyTasks,
  toLocalDateKey,
} from '../lib/dailyRollover';

interface HomeTasksSectionProps {
  userId: string;
  projects: ProjectWorkspace[];
  onUpdateProjectTask: (
    projectId: string,
    taskId: string,
    patch: Partial<TaskItem>
  ) => void;
  onAddProjectTask: (projectId: string, newTask: TaskItem) => void;
  onOpenProjectTask: (projectId: string, taskId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenDailyPlanner: () => void;
}

const STATUS_COLUMNS: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done'];

function statusIcon(status: TaskStatus) {
  switch (status) {
    case 'Done':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    case 'In Progress':
      return <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    case 'In Review':
      return <Eye className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-neutral-400" />;
  }
}

function priorityTextColor(priority: TaskPriority): string {
  switch (priority) {
    case 'Urgent':
      return 'text-red-600 dark:text-red-400 font-medium';
    case 'High':
      return 'text-amber-700 dark:text-amber-400 font-medium';
    case 'Medium':
      return 'text-neutral-600 dark:text-neutral-300';
    default:
      return 'text-neutral-500 dark:text-neutral-400';
  }
}

export const HomeTasksSection: React.FC<HomeTasksSectionProps> = ({
  userId,
  projects,
  onUpdateProjectTask,
  onAddProjectTask,
  onOpenProjectTask,
  onOpenProject,
  onOpenDailyPlanner,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [statusFilter, setStatusFilter] = useState<'Active' | 'All' | TaskStatus>('Active');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTagColors, setCustomTagColors] = useState<Record<string, TaskTagColorKey>>(
    () => loadCustomTagColors()
  );

  // Daily planner tasks synced on Home Dashboard with automatic next-day rollover
  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const dailyStorageKey = `folio_daily_planner_v1_${userId || 'local'}`;
  const [dailyTasksByDate, setDailyTasksByDate] = useState<
    Record<string, DailyTaskItem[]>
  >(() => {
    try {
      const raw = localStorage.getItem(dailyStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyPlannerState;
        if (parsed && parsed.tasksByDate) {
          const { tasksByDate: rolled, rolledCount } =
            rolloverPastUncompletedDailyTasks(parsed.tasksByDate, todayKey);
          if (rolledCount > 0) {
            localStorage.setItem(
              dailyStorageKey,
              JSON.stringify({ ...parsed, tasksByDate: rolled })
            );
          }
          return rolled;
        }
      }
    } catch {
      // ignore storage errors
    }
    return {};
  });

  const [newDailyTaskTitle, setNewDailyTaskTitle] = useState('');
  const [newDailyTaskTag, setNewDailyTaskTag] = useState('Work');

  const persistDailyTasksMap = (nextMap: Record<string, DailyTaskItem[]>) => {
    setDailyTasksByDate(nextMap);
    try {
      const raw = localStorage.getItem(dailyStorageKey);
      const parsed: DailyPlannerState = raw
        ? JSON.parse(raw)
        : {
            tasksByDate: {},
            notesByDate: {},
            habits: [],
            customTags: [],
          };
      localStorage.setItem(
        dailyStorageKey,
        JSON.stringify({
          ...parsed,
          tasksByDate: nextMap,
        })
      );
    } catch {
      // ignore storage errors
    }
  };

  const todayDailyTasks = useMemo(
    () => dailyTasksByDate[todayKey] || [],
    [dailyTasksByDate, todayKey]
  );

  const handleAddDailyTaskFromHome = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDailyTaskTitle.trim();
    if (!clean) return;
    const item: DailyTaskItem = {
      id: uid('dtask'),
      date: todayKey,
      title: clean,
      completed: false,
      tag: newDailyTaskTag.trim() || 'Work',
      createdAt: new Date().toISOString(),
    };
    persistDailyTasksMap({
      ...dailyTasksByDate,
      [todayKey]: [...todayDailyTasks, item],
    });
    setNewDailyTaskTitle('');
  };

  const handleToggleDailyTaskFromHome = (taskId: string) => {
    persistDailyTasksMap({
      ...dailyTasksByDate,
      [todayKey]: todayDailyTasks.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    });
  };

  const handleMoveDailyTaskToTomorrow = (taskId: string) => {
    const { tasksByDate: nextMap, moved } = moveSingleTaskToNextDay(
      dailyTasksByDate,
      todayKey,
      taskId
    );
    if (moved) {
      persistDailyTasksMap(nextMap);
    }
  };

  const handleMoveAllUncompletedDailyToTomorrow = () => {
    const { tasksByDate: nextMap, movedCount } = moveUncompletedTasksToNextDay(
      dailyTasksByDate,
      todayKey
    );
    if (movedCount > 0) {
      persistDailyTasksMap(nextMap);
    }
  };

  // Quick-add project task state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickProjectId, setQuickProjectId] = useState<string>('');
  const [quickTag, setQuickTag] = useState<string>('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('Medium');

  // Drag state for board mode
  const [draggedItem, setDraggedItem] = useState<{
    projectId: string;
    taskId: string;
  } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  const switcherId = useId();
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const onTagColorsUpdated = () => {
      setCustomTagColors(loadCustomTagColors());
    };
    window.addEventListener('folio-tag-colors-updated', onTagColorsUpdated);
    return () => window.removeEventListener('folio-tag-colors-updated', onTagColorsUpdated);
  }, []);

  useEffect(() => {
    if (projects.length > 0 && (!quickProjectId || !projects.some((p) => p.id === quickProjectId))) {
      setQuickProjectId(projects[0].id);
    }
  }, [projects, quickProjectId]);

  const allEntries = useMemo(() => {
    return projects.flatMap((project) =>
      project.tasks.map((task) => ({
        project,
        task,
      }))
    );
  }, [projects]);

  const allTags = useMemo(() => {
    const seen = new Map<string, string>();
    allEntries.forEach(({ task }) => {
      parseTaskTags(task.tags).forEach((t) => {
        const key = t.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, t);
        }
      });
    });
    return Array.from(seen.values());
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEntries.filter(({ project, task }) => {
      if (projectFilter !== 'All' && project.id !== projectFilter) return false;
      if (viewMode === 'list') {
        if (statusFilter === 'Active' && task.status === 'Done') return false;
        if (
          statusFilter !== 'Active' &&
          statusFilter !== 'All' &&
          task.status !== statusFilter
        ) {
          return false;
        }
      }
      if (tagFilter !== 'All') {
        const tags = parseTaskTags(task.tags).map((t) => t.toLowerCase());
        if (!tags.includes(tagFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        project.title.toLowerCase().includes(q) ||
        task.tags.toLowerCase().includes(q) ||
        task.assignee.toLowerCase().includes(q)
      );
    });
  }, [allEntries, projectFilter, viewMode, statusFilter, tagFilter, searchQuery]);

  const handleQuickAdd = (e: React.FormEvent, targetStatus: TaskStatus = 'Backlog') => {
    e.preventDefault();
    const targetPid =
      projectFilter !== 'All' ? projectFilter : quickProjectId || projects[0]?.id;
    if (!targetPid || !quickTitle.trim()) return;
    const newTask: TaskItem = {
      id: uid('task'),
      title: quickTitle.trim(),
      status: targetStatus,
      priority: quickPriority,
      assignee: '',
      dueDate: todayIso,
      tags: quickTag.trim() || (tagFilter !== 'All' ? tagFilter : ''),
      notes: '',
    };
    onAddProjectTask(targetPid, newTask);
    setQuickTitle('');
  };

  const completedDailyCount = todayDailyTasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-6">
      {/* 1. Today's Daily Tasks (with automatic next-day rollover) */}
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#20201E]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenDailyPlanner}
              className="inline-flex items-center gap-2 font-display text-sm font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
            >
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Today&apos;s Daily Tasks</span>
            </button>
            <span className="font-mono text-xs tabular-nums text-neutral-400">
              {completedDailyCount}/{todayDailyTasks.length}
            </span>
            {todayDailyTasks.some((t) => !t.completed) && (
              <button
                type="button"
                onClick={handleMoveAllUncompletedDailyToTomorrow}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-[#F8F8F7] px-2 py-0.5 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                title={`Move all uncompleted tasks to tomorrow (${getNextDateKey(todayKey)})`}
              >
                <span>Move uncompleted to next day</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenDailyPlanner}
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <span>Open Daily Planner</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Quick Add Today's Daily Task */}
        <form
          onSubmit={handleAddDailyTaskFromHome}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200/90 bg-[#F8F8F7] px-2.5 py-1.5 dark:border-neutral-800 dark:bg-[#191918]"
        >
          <input
            type="text"
            value={newDailyTaskTitle}
            onChange={(e) => setNewDailyTaskTitle(e.target.value)}
            placeholder="Add a daily task for today (unfinished tasks roll over to the next day)..."
            className="min-w-[180px] flex-1 bg-transparent text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <input
            type="text"
            value={newDailyTaskTag}
            onChange={(e) => setNewDailyTaskTag(e.target.value)}
            placeholder="Tag"
            className="w-24 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-300"
          />
          <button
            type="submit"
            disabled={!newDailyTaskTitle.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </form>

        {/* Daily Task Rows */}
        {todayDailyTasks.length === 0 ? (
          <p className="py-1 text-xs text-neutral-400">
            No daily tasks for today yet. Uncompleted tasks from past days automatically roll over here.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {todayDailyTasks.map((dTask) => {
              const tagTheme = getTaskTagColorTheme(dTask.tag, customTagColors);
              return (
                <div
                  key={dTask.id}
                  className="group flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleDailyTaskFromHome(dTask.id)}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        dTask.completed
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-neutral-300 bg-white hover:border-neutral-500 dark:border-neutral-600 dark:bg-transparent'
                      }`}
                      aria-label={`Toggle "${dTask.title}"`}
                    >
                      {dTask.completed && <Check className="h-3 w-3 stroke-[2.5]" />}
                    </button>
                    <span
                      className={`truncate text-sm ${
                        dTask.completed
                          ? 'text-neutral-400 line-through dark:text-neutral-500'
                          : 'text-neutral-800 dark:text-neutral-100'
                      }`}
                    >
                      {dTask.title}
                    </span>
                    {dTask.rolledOverFrom && dTask.rolledOverFrom !== todayKey && (
                      <span
                        className="shrink-0 font-mono text-[11px] tabular-nums text-amber-600 dark:text-amber-400"
                        title={`Automatically carried forward from ${dTask.rolledOverFrom}`}
                      >
                        From {dTask.rolledOverFrom}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs">
                    <span className={`font-medium ${tagTheme.textClass}`}>
                      {dTask.tag}
                    </span>
                    {!dTask.completed && (
                      <button
                        type="button"
                        onClick={() => handleMoveDailyTaskToTomorrow(dTask.id)}
                        className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        title={`Move to next day (${getNextDateKey(todayKey)})`}
                        aria-label="Move daily task to next day"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Project Tasks Section */}
      {projects.length > 0 && (
        <div className="space-y-3.5">
          {/* Section Header & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Project Tasks
              </h2>
              <span className="font-mono text-xs tabular-nums text-neutral-400">
                {filteredEntries.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* List / Board Switcher */}
              <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100/90 p-0.5 dark:bg-neutral-800/80">
                {(
                  [
                    { id: 'list', label: 'List', icon: <ListChecks className="h-3.5 w-3.5" /> },
                    { id: 'board', label: 'Board', icon: <Kanban className="h-3.5 w-3.5" /> },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    className={`relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      viewMode === mode.id
                        ? 'text-neutral-900 dark:text-neutral-100'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                    }`}
                  >
                    {viewMode === mode.id && (
                      <motion.span
                        layoutId={`home-tasks-view-${switcherId}`}
                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-md bg-white shadow-2xs dark:bg-[#191918]"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {mode.icon}
                      <span>{mode.label}</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Status Filter (for List mode) */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100/90 p-0.5 dark:bg-neutral-800/80">
                  {(['Active', 'In Progress', 'Done', 'All'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        statusFilter === st
                          ? 'bg-white text-neutral-900 shadow-2xs dark:bg-[#191918] dark:text-neutral-100'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}

              {/* Project Dropdown Filter */}
              <select
                value={projectFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectFilter(val);
                  if (val !== 'All') {
                    setQuickProjectId(val);
                  }
                }}
                aria-label="Filter tasks by project"
                className="rounded-lg border border-neutral-200/90 bg-white px-2.5 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-300"
              >
                <option value="All">All projects ({allEntries.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.title} ({p.tasks.length})
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-36 rounded-lg border border-neutral-200/90 bg-white py-1.5 pl-8 pr-2.5 text-xs text-neutral-800 outline-none transition-colors focus:border-neutral-400 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Interactive Project Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setProjectFilter('All')}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                projectFilter === 'All'
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              All projects
            </button>
            {projects.map((p) => {
              const isActive = projectFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProjectFilter((curr) => {
                      const next = curr === p.id ? 'All' : p.id;
                      if (next !== 'All') {
                        setQuickProjectId(next);
                      }
                      return next;
                    });
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="max-w-[150px] truncate">{p.title}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive
                        ? 'text-neutral-300 dark:text-neutral-600'
                        : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {p.tasks.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Tag Filter Bar */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTagFilter('All')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tagFilter === 'All'
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80 dark:bg-neutral-800/80 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                All tags
              </button>
              {allTags.map((tag) => {
                const theme = getTaskTagColorTheme(tag, customTagColors);
                const isActive = tagFilter.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTagFilter((curr) =>
                        curr.toLowerCase() === tag.toLowerCase() ? 'All' : tag
                      )
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      isActive ? theme.filterActiveClass : theme.filterInactiveClass
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Add Project Task Bar on Home Dashboard */}
          <form
            onSubmit={(e) => handleQuickAdd(e, 'Backlog')}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-[#20201E]"
          >
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Add a project task directly from Home..."
              className="min-w-[180px] flex-1 bg-transparent px-2.5 py-1 text-xs text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
            />
            {projects.length > 1 && projectFilter === 'All' && (
              <select
                value={quickProjectId}
                onChange={(e) => setQuickProjectId(e.target.value)}
                aria-label="Target project for new task"
                className="max-w-[160px] truncate rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.title}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              value={quickTag}
              onChange={(e) => setQuickTag(e.target.value)}
              placeholder="Tag (e.g. Design)"
              className="w-28 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2 py-1 text-xs text-neutral-700 outline-none placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300"
            />
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              aria-label="New task priority"
              className="rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2 py-1 text-xs text-neutral-700 outline-none dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            <button
              type="submit"
              disabled={!quickTitle.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </button>
          </form>

          {/* Main Content: LIST or BOARD */}
          {viewMode === 'list' ? (
            filteredEntries.length === 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-5 py-4 text-xs text-neutral-500 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-400">
                <span>
                  {allEntries.length === 0
                    ? 'No tasks across your projects yet. Add one above to get started.'
                    : 'No tasks match the current filter.'}
                </span>
                {(statusFilter !== 'All' ||
                  projectFilter !== 'All' ||
                  tagFilter !== 'All' ||
                  searchQuery.trim() !== '') &&
                  allEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('All');
                        setTagFilter('All');
                        setProjectFilter('All');
                        setSearchQuery('');
                      }}
                      className="font-medium text-neutral-800 hover:underline dark:text-neutral-200"
                    >
                      Show all tasks
                    </button>
                  )}
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#20201E]">
                {filteredEntries.map(({ project, task }) => {
                  const taskTags = parseTaskTags(task.tags);
                  const isOverdue =
                    Boolean(task.dueDate) &&
                    task.dueDate < todayIso &&
                    task.status !== 'Done';

                  return (
                    <div
                      key={`${project.id}-${task.id}`}
                      onClick={() => onOpenProjectTask(project.id, task.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenProjectTask(project.id, task.id);
                        }
                      }}
                      className="group flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/40"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateProjectTask(project.id, task.id, {
                              status: task.status === 'Done' ? 'In Progress' : 'Done',
                            });
                          }}
                          className="shrink-0 transition-transform hover:scale-110"
                          title={
                            task.status === 'Done' ? 'Mark In Progress' : 'Mark Done'
                          }
                          aria-label="Toggle task status"
                        >
                          {statusIcon(task.status)}
                        </button>

                        <span
                          className={`truncate text-sm ${
                            task.status === 'Done'
                              ? 'text-neutral-400 line-through dark:text-neutral-500'
                              : 'font-medium text-neutral-900 group-hover:underline dark:text-neutral-100'
                          }`}
                        >
                          {task.title || 'Untitled task'}
                        </span>

                        {task.docId && (
                          <span
                            className="inline-flex shrink-0 items-center text-blue-600 dark:text-blue-400"
                            title="Google Doc linked"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        {/* Colored Tags */}
                        {taskTags.map((tag) => {
                          const tTheme = getTaskTagColorTheme(tag, customTagColors);
                          return (
                            <React.Fragment key={tag}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagFilter((curr) =>
                                    curr.toLowerCase() === tag.toLowerCase()
                                      ? 'All'
                                      : tag
                                  );
                                }}
                                className={`font-medium hover:underline ${tTheme.textClass}`}
                              >
                                {tag}
                              </button>
                              <span aria-hidden="true">·</span>
                            </React.Fragment>
                          );
                        })}

                        {/* Project Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject(project.id);
                          }}
                          className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-300 dark:hover:text-neutral-100"
                          title={`Open project ${project.title}`}
                        >
                          <span>{project.icon}</span>
                          <span className="max-w-[140px] truncate">{project.title}</span>
                        </button>

                        <span aria-hidden="true">·</span>

                        {/* Status Selector */}
                        <select
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            onUpdateProjectTask(project.id, task.id, {
                              status: e.target.value as TaskStatus,
                            })
                          }
                          aria-label="Task status"
                          className="bg-transparent text-xs text-neutral-600 outline-none hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                        >
                          {STATUS_COLUMNS.map((s) => (
                            <option key={s} value={s} className="dark:bg-[#20201E]">
                              {s}
                            </option>
                          ))}
                        </select>

                        <span aria-hidden="true">·</span>

                        <span className={priorityTextColor(task.priority)}>
                          {task.priority}
                        </span>

                        {task.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`font-mono text-[11px] tabular-nums ${
                                isOverdue
                                  ? 'font-medium text-red-600 dark:text-red-400'
                                  : ''
                              }`}
                            >
                              {task.dueDate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* HOME DASHBOARD BOARD VIEW (containerless columns with tight gap) */
            <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {STATUS_COLUMNS.map((columnStatus) => {
                const colEntries = filteredEntries.filter(
                  ({ task }) => task.status === columnStatus
                );
                const isDropTarget = dragOverColumn === columnStatus;

                return (
                  <div
                    key={columnStatus}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverColumn(columnStatus);
                    }}
                    onDragLeave={() => setDragOverColumn(null)}
                    onDrop={() => {
                      if (draggedItem) {
                        onUpdateProjectTask(draggedItem.projectId, draggedItem.taskId, {
                          status: columnStatus,
                        });
                      }
                      setDraggedItem(null);
                      setDragOverColumn(null);
                    }}
                    className={`flex flex-col rounded-lg transition-colors ${
                      isDropTarget
                        ? '-m-1.5 bg-blue-50/50 p-1.5 ring-1 ring-blue-400/60 dark:bg-blue-950/25 dark:ring-blue-500/50'
                        : ''
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between px-0.5">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(columnStatus)}
                        <span className="font-display text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                          {columnStatus}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-neutral-400">
                          {colEntries.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {colEntries.map(({ project, task }) => {
                          const taskTags = parseTaskTags(task.tags);
                          const primaryTagTheme =
                            taskTags.length > 0
                              ? getTaskTagColorTheme(taskTags[0], customTagColors)
                              : null;
                          const isOverdue =
                            Boolean(task.dueDate) &&
                            task.dueDate < todayIso &&
                            task.status !== 'Done';

                          return (
                            <motion.div
                              key={`${project.id}-${task.id}`}
                              layout="position"
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              whileHover={{ y: -1.5 }}
                              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                            >
                              <div
                                draggable
                                onDragStart={() =>
                                  setDraggedItem({
                                    projectId: project.id,
                                    taskId: task.id,
                                  })
                                }
                                onDragEnd={() => {
                                  setDraggedItem(null);
                                  setDragOverColumn(null);
                                }}
                                onClick={() => onOpenProjectTask(project.id, task.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onOpenProjectTask(project.id, task.id);
                                  }
                                }}
                                className={`group relative cursor-pointer overflow-hidden rounded-lg border px-2.5 py-2 transition-all hover:shadow-xs ${
                                  primaryTagTheme
                                    ? primaryTagTheme.cardSurfaceClass
                                    : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-[#191918] dark:hover:border-neutral-700'
                                }`}
                              >
                                {primaryTagTheme && (
                                  <div
                                    className={`absolute inset-x-0 top-0 h-0.5 ${primaryTagTheme.cardTopBarClass}`}
                                  />
                                )}

                                {/* Colored Tags + Project Context */}
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                                  <div className="flex flex-wrap items-center gap-1.5 font-medium">
                                    {taskTags.map((tag, idx) => {
                                      const tTheme = getTaskTagColorTheme(
                                        tag,
                                        customTagColors
                                      );
                                      return (
                                        <React.Fragment key={`${tag}-${idx}`}>
                                          {idx > 0 && (
                                            <span
                                              aria-hidden="true"
                                              className="text-neutral-300 dark:text-neutral-700"
                                            >
                                              ·
                                            </span>
                                          )}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTagFilter((curr) =>
                                                curr.toLowerCase() === tag.toLowerCase()
                                                  ? 'All'
                                                  : tag
                                              );
                                            }}
                                            className={`${tTheme.textClass} hover:underline`}
                                          >
                                            {tag}
                                          </button>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenProject(project.id);
                                    }}
                                    className="max-w-[120px] truncate text-neutral-500 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-200"
                                  >
                                    {project.icon} {project.title}
                                  </button>
                                </div>

                                {/* Task Title */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex min-w-0 items-start gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateProjectTask(project.id, task.id, {
                                          status:
                                            task.status === 'Done' ? 'In Progress' : 'Done',
                                        });
                                      }}
                                      className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                                      aria-label="Toggle task completion"
                                    >
                                      {statusIcon(task.status)}
                                    </button>
                                    <div
                                      className={`text-[13px] font-medium leading-snug ${
                                        task.status === 'Done'
                                          ? 'text-neutral-400 line-through dark:text-neutral-500'
                                          : 'text-neutral-900 dark:text-neutral-100'
                                      }`}
                                    >
                                      {task.title || 'Untitled task'}
                                    </div>
                                  </div>
                                  {task.docId && (
                                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-neutral-200/50 pt-1.5 text-[11px] text-neutral-500 dark:border-neutral-800/70 dark:text-neutral-400">
                                  <div className="flex items-center gap-1.5">
                                    <span className={priorityTextColor(task.priority)}>
                                      {task.priority}
                                    </span>
                                    {task.dueDate && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span
                                          className={`font-mono text-[11px] tabular-nums ${
                                            isOverdue
                                              ? 'font-medium text-red-600 dark:text-red-400'
                                              : ''
                                          }`}
                                        >
                                          {task.dueDate}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {task.assignee && (
                                    <span className="max-w-[95px] truncate text-[11px]">
                                      {task.assignee}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
