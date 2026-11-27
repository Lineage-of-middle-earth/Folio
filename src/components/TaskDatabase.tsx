import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Eye,
  FilePlus2,
  FileText,
  Kanban,
  Link2,
  ListChecks,
  Maximize2,
  PanelRight,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import {
  DocBlock,
  ProjectDocPage,
  TaskDocTemplate,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/workspace';
import { buildTaskDocStarterBlocks, uid } from '../lib/googleWorkspaceApi';
import {
  TASK_TAG_COLOR_PALETTE,
  TaskTagColorKey,
  getTaskTagColorTheme,
  loadCustomTagColors,
  parseTaskTags,
  saveCustomTagColor,
} from '../lib/tagColors';
import { BlockEditor } from './BlockEditor';

interface TaskDatabaseProps {
  tasks: TaskItem[];
  viewMode: 'board' | 'table' | 'list';
  onViewModeChange: (mode: 'board' | 'table' | 'list') => void;
  onTasksChange: (nextTasks: TaskItem[]) => void;
  onTaskDocBlocksChange: (taskId: string, nextBlocks: DocBlock[]) => void;
  onCreateTaskDoc: (task: TaskItem, docTitle: string, blocks: DocBlock[]) => void;
  onCreateMissingTaskDocs: () => void;
  onLinkExistingTaskDoc: (task: TaskItem) => void;
  onLoadTaskDoc: (task: TaskItem) => Promise<void>;
  onPullTaskDoc: (task: TaskItem) => Promise<void>;
  onPushTaskDoc: (task: TaskItem) => void;
  loadingTaskDocIds: Record<string, boolean>;
  syncingTaskDocIds: Record<string, boolean>;
  autoSyncEnabled: boolean;
  sheetTitle: string | null;
  sheetUrl: string | null;
  requestedTaskId?: string | null;
  onClearRequestedTaskId?: () => void;
  extraDocs?: ProjectDocPage[];
  onCreateSubPage?: (
    parentDocId: string,
    parentTitle: string,
    title: string,
    replaceBlockId?: string
  ) => void;
  onOpenSubPage?: (docId: string) => void;
}

const STATUS_COLUMNS: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done'];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

const DOC_TEMPLATES: Array<{ id: TaskDocTemplate; label: string }> = [
  { id: 'spec', label: 'Task Spec' },
  { id: 'meeting', label: 'Meeting Notes' },
  { id: 'blank', label: 'Blank Doc' },
];

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

export const TaskDatabase: React.FC<TaskDatabaseProps> = ({
  tasks,
  viewMode,
  onViewModeChange,
  onTasksChange,
  onTaskDocBlocksChange,
  onCreateTaskDoc,
  onCreateMissingTaskDocs,
  onLinkExistingTaskDoc,
  onLoadTaskDoc,
  onPullTaskDoc,
  onPushTaskDoc,
  loadingTaskDocIds,
  syncingTaskDocIds,
  autoSyncEnabled,
  sheetTitle,
  sheetUrl,
  requestedTaskId,
  onClearRequestedTaskId,
  extraDocs = [],
  onCreateSubPage,
  onOpenSubPage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All');
  const [tagFilter, setTagFilter] = useState<string>('All');
  const [customTagColors, setCustomTagColors] = useState<Record<string, TaskTagColorKey>>(
    () => loadCustomTagColors()
  );
  const [editingColorForTag, setEditingColorForTag] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<'side' | 'fullscreen'>('side');
  const [showNewDocForTaskId, setShowNewDocForTaskId] = useState<string | null>(null);

  // Sync custom tag colors across components
  useEffect(() => {
    const onTagColorsUpdated = () => {
      setCustomTagColors(loadCustomTagColors());
    };
    window.addEventListener('folio-tag-colors-updated', onTagColorsUpdated);
    return () => window.removeEventListener('folio-tag-colors-updated', onTagColorsUpdated);
  }, []);

  // Per-task local draft state before a Google Doc is created
  const [draftTitleMap, setDraftTitleMap] = useState<Record<string, string>>({});
  const [draftTemplateMap, setDraftTemplateMap] = useState<
    Record<string, TaskDocTemplate>
  >({});
  const [draftBlocksMap, setDraftBlocksMap] = useState<Record<string, DocBlock[]>>({});

  const switcherId = useId();

  // Open task automatically if navigated from DocumentsHub, Home Dashboard, or CommandPalette
  useEffect(() => {
    if (requestedTaskId && tasks.some((t) => t.id === requestedTaskId)) {
      setSelectedTaskId(requestedTaskId);
      onClearRequestedTaskId?.();
    }
  }, [requestedTaskId, tasks, onClearRequestedTaskId]);

  const allTags = useMemo(() => {
    const seen = new Map<string, string>();
    tasks.forEach((task) => {
      parseTaskTags(task.tags).forEach((t) => {
        const key = t.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, t);
        }
      });
    });
    return Array.from(seen.values());
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesPriority =
        priorityFilter === 'All' || task.priority === priorityFilter;
      if (!matchesPriority) return false;
      if (tagFilter !== 'All') {
        const taskTagList = parseTaskTags(task.tags).map((t) => t.toLowerCase());
        if (!taskTagList.includes(tagFilter.toLowerCase())) return false;
      }
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        task.assignee.toLowerCase().includes(q) ||
        task.tags.toLowerCase().includes(q) ||
        (task.docTitle || '').toLowerCase().includes(q)
      );
    });
  }, [tasks, searchQuery, priorityFilter, tagFilter]);

  const unlinkedDocsCount = useMemo(
    () => tasks.filter((t) => !t.docId).length,
    [tasks]
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // Automatically fetch linked Google Doc content when opening a task whose blocks aren't loaded yet
  useEffect(() => {
    if (!selectedTask || !selectedTask.docId) return;
    if (selectedTask.docBlocks !== undefined) return;
    if (loadingTaskDocIds[selectedTask.id]) return;
    onLoadTaskDoc(selectedTask);
  }, [selectedTask, loadingTaskDocIds, onLoadTaskDoc]);

  // Close whole-screen task document (or New Doc modal first) on Escape
  useEffect(() => {
    if (!selectedTaskId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNewDocForTaskId) {
          setShowNewDocForTaskId(null);
        } else {
          setSelectedTaskId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, showNewDocForTaskId]);

  const createTask = (status: TaskStatus = 'Backlog') => {
    const newTask: TaskItem = {
      id: uid('task'),
      title: 'Untitled task',
      status,
      priority: 'Medium',
      assignee: '',
      dueDate: new Date().toISOString().slice(0, 10),
      tags: tagFilter !== 'All' ? tagFilter : '',
      notes: '',
    };
    onTasksChange([...tasks, newTask]);
    setSelectedTaskId(newTask.id);
  };

  const updateTask = (taskId: string, patch: Partial<TaskItem>) => {
    onTasksChange(tasks.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  };

  const deleteTask = (taskId: string) => {
    onTasksChange(tasks.filter((t) => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const handleDropOnColumn = (targetStatus: TaskStatus) => {
    if (draggedTaskId) {
      updateTask(draggedTaskId, { status: targetStatus });
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const getDraftTemplate = (taskId: string): TaskDocTemplate =>
    draftTemplateMap[taskId] || 'spec';

  const getDraftTitle = (task: TaskItem): string =>
    draftTitleMap[task.id] ?? (task.title.trim() || 'Untitled task');

  const getDraftBlocks = (task: TaskItem): DocBlock[] =>
    draftBlocksMap[task.id] ??
    buildTaskDocStarterBlocks(task, getDraftTemplate(task.id));

  const applyTemplateToDraft = (task: TaskItem, template: TaskDocTemplate) => {
    setDraftTemplateMap((prev) => ({ ...prev, [task.id]: template }));
    setDraftBlocksMap((prev) => ({
      ...prev,
      [task.id]: buildTaskDocStarterBlocks(task, template),
    }));
  };

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <div className="space-y-4">
      {/* Database Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-0.5 rounded-lg bg-neutral-100/90 p-0.5 dark:bg-neutral-800/80">
            {(
              [
                { id: 'board', label: 'Board', icon: <Kanban className="h-3.5 w-3.5" /> },
                { id: 'table', label: 'Table', icon: <Table2 className="h-3.5 w-3.5" /> },
                { id: 'list', label: 'List', icon: <ListChecks className="h-3.5 w-3.5" /> },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onViewModeChange(mode.id)}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  viewMode === mode.id
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {viewMode === mode.id && (
                  <motion.span
                    layoutId={`taskdb-view-${switcherId}`}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
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

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-40 rounded-lg border border-neutral-200/90 bg-white py-1.5 pl-8 pr-2.5 text-xs text-neutral-800 outline-none transition-colors focus:border-neutral-400 dark:border-neutral-800 dark:bg-[#191918] dark:text-neutral-200 dark:focus:border-neutral-600"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as 'All' | TaskPriority)
            }
            aria-label="Filter by priority"
            className="rounded-lg border border-neutral-200/90 bg-white px-2.5 py-1.5 text-xs text-neutral-600 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-[#191918] dark:text-neutral-300"
          >
            <option value="All">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unlinkedDocsCount > 0 && (
            <button
              type="button"
              onClick={onCreateMissingTaskDocs}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              title="Create and link a Google Doc for every task without one"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Create Docs ({unlinkedDocsCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => createTask('Backlog')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Interactive Tag Filter Bar (color-coded according to tags) */}
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

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-14 text-center dark:border-neutral-800 dark:bg-[#20201E]">
          <ListChecks className="h-8 w-8 text-neutral-400" />
          <h3 className="mt-3 font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            No tasks in this database yet
          </h3>
          <p className="mt-1 max-w-sm text-xs text-neutral-500 dark:text-neutral-400">
            Add your first task to manage it on this Notion-style board, open its full-screen Google Doc page, and keep its link synced in Google Sheets.
          </p>
          <button
            type="button"
            onClick={() => createTask('Backlog')}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Task</span>
          </button>
        </div>
      ) : viewMode === 'board' ? (
        /* BOARD (KANBAN) VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_COLUMNS.map((columnStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === columnStatus);
            const isDropTarget = dragOverColumn === columnStatus;

            return (
              <div
                key={columnStatus}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(columnStatus);
                }}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={() => handleDropOnColumn(columnStatus)}
                className={`flex min-h-[290px] flex-col rounded-xl border p-3 transition-colors ${
                  isDropTarget
                    ? 'border-blue-400 bg-blue-50/40 dark:border-blue-500 dark:bg-blue-950/20'
                    : 'border-neutral-200/80 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]'
                }`}
              >
                {/* Column Header */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    {statusIcon(columnStatus)}
                    <span className="font-display text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {columnStatus}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-neutral-400">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => createTask(columnStatus)}
                    className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    title={`Add task to ${columnStatus}`}
                    aria-label={`Add task to ${columnStatus}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-2.5">
                  <AnimatePresence initial={false}>
                    {colTasks.map((task) => {
                      const isDragging = draggedTaskId === task.id;
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
                          key={task.id}
                          layout="position"
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{
                            opacity: isDragging ? 0.5 : 1,
                            y: 0,
                            scale: isDragging ? 0.98 : 1,
                          }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div
                            draggable
                            onDragStart={() => setDraggedTaskId(task.id)}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverColumn(null);
                            }}
                            onClick={() => setSelectedTaskId(task.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedTaskId(task.id);
                              }
                            }}
                            className={`group relative cursor-pointer overflow-hidden rounded-lg border p-3 transition-all hover:shadow-xs ${
                              primaryTagTheme
                                ? primaryTagTheme.cardSurfaceClass
                                : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-[#191918] dark:hover:border-neutral-700'
                            }`}
                          >
                            {/* Top horizontal tag color bar */}
                            {primaryTagTheme && (
                              <div
                                className={`absolute inset-x-0 top-0 h-1 ${primaryTagTheme.cardTopBarClass}`}
                              />
                            )}

                            {/* Colored Tag Row */}
                            {taskTags.length > 0 && (
                              <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                                {taskTags.map((tag, tIdx) => {
                                  const tTheme = getTaskTagColorTheme(tag, customTagColors);
                                  return (
                                    <React.Fragment key={`${tag}-${tIdx}`}>
                                      {tIdx > 0 && (
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
                                        title={`Filter board by "${tag}"`}
                                      >
                                        {tag}
                                      </button>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            )}

                            {/* Title + Quick Status Toggle + Linked Doc Indicator */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-start gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTask(task.id, {
                                      status:
                                        task.status === 'Done' ? 'In Progress' : 'Done',
                                    });
                                  }}
                                  className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                                  title={
                                    task.status === 'Done'
                                      ? 'Mark In Progress'
                                      : 'Mark Done'
                                  }
                                  aria-label="Toggle task completion"
                                >
                                  {statusIcon(task.status)}
                                </button>
                                <div
                                  className={`text-sm font-medium leading-snug ${
                                    task.status === 'Done'
                                      ? 'text-neutral-400 line-through dark:text-neutral-500'
                                      : 'text-neutral-900 dark:text-neutral-100'
                                  }`}
                                >
                                  {task.title || 'Untitled task'}
                                </div>
                              </div>
                              {task.docId && (
                                <span
                                  className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400"
                                  title={
                                    task.dirtyTaskDoc
                                      ? 'Google Doc linked (unsynced edits)'
                                      : 'Google Doc linked'
                                  }
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>

                            {/* Optional Notes Preview */}
                            {task.notes && task.notes.trim() && (
                              <p className="mt-1.5 line-clamp-2 pl-5 text-xs text-neutral-500 dark:text-neutral-400">
                                {task.notes}
                              </p>
                            )}

                            {/* Card Footer Metadata */}
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/60 pt-2 text-xs text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-400">
                              <div className="flex flex-wrap items-center gap-1.5">
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
                                <span className="max-w-[115px] truncate text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
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

                {/* Quick Add Task in Column Footer */}
                <button
                  type="button"
                  onClick={() => createTask(columnStatus)}
                  className="mt-2.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium text-neutral-400 transition-colors hover:bg-neutral-200/60 hover:text-neutral-700 dark:hover:bg-neutral-800/70 dark:hover:text-neutral-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New task</span>
                </button>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE (SPREADSHEET) VIEW */
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#191918]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#F8F8F7] text-neutral-500 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-400">
                <th className="w-10 px-3 py-2.5 font-mono font-normal">#</th>
                <th className="min-w-[200px] px-3 py-2.5 font-medium">Task</th>
                <th className="w-32 px-3 py-2.5 font-medium">Status</th>
                <th className="w-24 px-3 py-2.5 font-medium">Priority</th>
                <th className="w-40 px-3 py-2.5 font-medium">Tags</th>
                <th className="w-32 px-3 py-2.5 font-medium">Assignee</th>
                <th className="w-28 px-3 py-2.5 font-medium">Due Date</th>
                <th className="w-36 px-3 py-2.5 font-medium">Google Doc Link</th>
                <th className="w-16 px-3 py-2.5 text-right font-medium">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredTasks.map((task, idx) => {
                const rowTags = parseTaskTags(task.tags);
                const firstTagTheme =
                  rowTags.length > 0
                    ? getTaskTagColorTheme(rowTags[0], customTagColors)
                    : null;
                return (
                  <tr
                    key={task.id}
                    className="h-10 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-3 py-1.5 font-mono tabular-nums text-neutral-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={task.title}
                        onChange={(e) => updateTask(task.id, { title: e.target.value })}
                        className="w-full bg-transparent text-xs font-medium text-neutral-900 outline-none focus:underline dark:text-neutral-100"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTask(task.id, { status: e.target.value as TaskStatus })
                        }
                        className="w-full bg-transparent text-xs text-neutral-700 outline-none dark:text-neutral-300"
                      >
                        {STATUS_COLUMNS.map((s) => (
                          <option key={s} value={s} className="dark:bg-[#20201E]">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={task.priority}
                        onChange={(e) =>
                          updateTask(task.id, {
                            priority: e.target.value as TaskPriority,
                          })
                        }
                        className={`w-full bg-transparent text-xs outline-none ${priorityTextColor(
                          task.priority
                        )}`}
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p} className="dark:bg-[#20201E]">
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={task.tags}
                        placeholder="Add tags..."
                        onChange={(e) => updateTask(task.id, { tags: e.target.value })}
                        className={`w-full bg-transparent text-xs font-medium outline-none placeholder:font-normal placeholder:text-neutral-400 ${
                          firstTagTheme
                            ? firstTagTheme.textClass
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={task.assignee}
                        placeholder="Unassigned"
                        onChange={(e) =>
                          updateTask(task.id, { assignee: e.target.value })
                        }
                        className="w-full bg-transparent text-xs text-neutral-700 outline-none placeholder:text-neutral-400 dark:text-neutral-300"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) =>
                          updateTask(task.id, { dueDate: e.target.value })
                        }
                        className="bg-transparent font-mono text-[11px] tabular-nums text-neutral-600 outline-none dark:text-neutral-400"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      {task.docId ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{task.dirtyTaskDoc ? 'Edited' : 'Open Doc'}</span>
                          </button>
                          {task.docUrl && (
                            <a
                              href={task.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                              title="Open directly in Google Docs"
                              aria-label="Open in Google Docs"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className="text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                        >
                          + Create Doc
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className="rounded px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          {STATUS_COLUMNS.map((status) => {
            const group = filteredTasks.filter((t) => t.status === status);
            if (group.length === 0) return null;
            return (
              <div key={status} className="space-y-1">
                <div className="flex items-center gap-2 px-1 py-1">
                  {statusIcon(status)}
                  <span className="font-display text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {status}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-neutral-400">
                    {group.length}
                  </span>
                </div>
                <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#191918]">
                  <AnimatePresence initial={false}>
                    {group.map((task) => {
                      const taskTags = parseTaskTags(task.tags);
                      return (
                        <motion.div
                          key={task.id}
                          layout="position"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="flex cursor-pointer items-center justify-between gap-4 px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.84 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTask(task.id, {
                                  status: task.status === 'Done' ? 'Backlog' : 'Done',
                                });
                              }}
                              className="shrink-0"
                              aria-label="Toggle task done"
                            >
                              {statusIcon(task.status)}
                            </motion.button>
                            <span
                              className={`truncate text-sm ${
                                task.status === 'Done'
                                  ? 'text-neutral-400 line-through'
                                  : 'font-medium text-neutral-900 dark:text-neutral-100'
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.docId && (
                              <span
                                className="inline-flex shrink-0 items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400"
                                title="Google Doc linked"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                            {taskTags.map((tag) => {
                              const tTheme = getTaskTagColorTheme(tag, customTagColors);
                              return (
                                <React.Fragment key={tag}>
                                  <span className={`font-medium ${tTheme.textClass}`}>
                                    {tag}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                </React.Fragment>
                              );
                            })}
                            <span className={priorityTextColor(task.priority)}>
                              {task.priority}
                            </span>
                            {task.assignee && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{task.assignee}</span>
                              </>
                            )}
                            {task.dueDate && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-[11px] tabular-nums">
                                  {task.dueDate}
                                </span>
                              </>
                            )}
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

      {/* Side View (Notion Peek) or Whole-Screen Task Document View */}
      <AnimatePresence>
        {selectedTask && (
          <>
            {taskViewMode === 'side' && (
              <motion.div
                key="task-side-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                onClick={() => setSelectedTaskId(null)}
                className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
              />
            )}
            <motion.div
              key="task-fullscreen-page"
              initial={
                taskViewMode === 'side'
                  ? { opacity: 0, x: 48 }
                  : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={
                taskViewMode === 'side'
                  ? { opacity: 0, x: 48 }
                  : { opacity: 0, y: 10 }
              }
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={
                taskViewMode === 'side'
                  ? 'fixed inset-y-0 right-0 z-40 flex w-full max-w-[680px] flex-col border-l border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#191918]'
                  : 'fixed inset-0 z-40 flex flex-col bg-white dark:bg-[#191918]'
              }
            >
              {/* Top Bar with Side View <-> Full Screen Toggle */}
              <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setTaskViewMode((curr) =>
                        curr === 'side' ? 'fullscreen' : 'side'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100 dark:hover:bg-neutral-800 shrink-0"
                    title={
                      taskViewMode === 'side'
                        ? 'Expand to Full Screen'
                        : 'Switch to Notion Side View'
                    }
                  >
                    {taskViewMode === 'side' ? (
                      <>
                        <Maximize2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Full Screen</span>
                      </>
                    ) : (
                      <>
                        <PanelRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Side View</span>
                      </>
                    )}
                  </button>

                  <span className="flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                      {selectedTask.docTitle || selectedTask.title || 'Task Document'}
                    </span>
                  </span>
                  {selectedTask.docId ? (
                    syncingTaskDocIds[selectedTask.id] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Syncing...</span>
                      </span>
                    ) : selectedTask.dirtyTaskDoc ? (
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
                        {autoSyncEnabled ? 'Auto-sync pending' : 'Unsynced edits'}
                      </span>
                    ) : (
                      <span className="hidden items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0 sm:inline-flex">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Synced</span>
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-neutral-400 whitespace-nowrap shrink-0">
                      Draft Doc
                    </span>
                  )}
                </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {selectedTask.docId && (
                  <>
                    {selectedTask.docUrl && (
                      <a
                        href={selectedTask.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                      >
                        <span>Open in Google Docs</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onPullTaskDoc(selectedTask)}
                      disabled={Boolean(loadingTaskDocIds[selectedTask.id])}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                      title="Pull latest content from Google Docs"
                    >
                      <ArrowDownToLine className="h-3 w-3" />
                      <span>Pull</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (showNewDocForTaskId === selectedTask.id) {
                          setShowNewDocForTaskId(null);
                        } else {
                          setDraftTitleMap((prev) => ({
                            ...prev,
                            [selectedTask.id]: `${selectedTask.title.trim() || 'Task'} — Notes`,
                          }));
                          setShowNewDocForTaskId(selectedTask.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                      title="Create a brand-new Google Doc inside this task"
                    >
                      <FilePlus2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span>New Doc</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onLinkExistingTaskDoc(selectedTask)}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                      title="Switch linked Google Doc"
                    >
                      <Link2 className="h-3 w-3" />
                      <span>Switch Doc</span>
                    </button>
                    {!autoSyncEnabled && selectedTask.dirtyTaskDoc && (
                      <button
                        type="button"
                        onClick={() => onPushTaskDoc(selectedTask)}
                        disabled={Boolean(syncingTaskDocIds[selectedTask.id])}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                      >
                        <ArrowUpFromLine className="h-3 w-3" />
                        <span>Save to Doc</span>
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => deleteTask(selectedTask.id)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTaskId(null)}
                  className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Close (Esc)"
                  aria-label="Close whole-screen task document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Centered Whole-Screen Document Canvas */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8 sm:px-10">
                {/* Editable Task Title */}
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) =>
                    updateTask(selectedTask.id, { title: e.target.value })
                  }
                  placeholder="Task title"
                  className="w-full bg-transparent font-display text-3xl font-semibold tracking-tight text-neutral-900 outline-none dark:text-neutral-50 sm:text-4xl"
                />

                {/* Compact Task Properties (Synced with Google Sheets; doc link stored in Sheet) */}
                <div className="divide-y divide-neutral-200/80 border-y border-neutral-200/80 text-xs dark:divide-neutral-800 dark:border-neutral-800">
                  <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                    <div className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-neutral-500 dark:text-neutral-400">
                        Status
                      </span>
                      <select
                        value={selectedTask.status}
                        onChange={(e) =>
                          updateTask(selectedTask.id, {
                            status: e.target.value as TaskStatus,
                          })
                        }
                        className="flex-1 rounded-md bg-transparent px-2 py-1 font-medium text-neutral-900 outline-none hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {STATUS_COLUMNS.map((s) => (
                          <option key={s} value={s} className="dark:bg-[#20201E]">
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-neutral-500 dark:text-neutral-400">
                        Priority
                      </span>
                      <select
                        value={selectedTask.priority}
                        onChange={(e) =>
                          updateTask(selectedTask.id, {
                            priority: e.target.value as TaskPriority,
                          })
                        }
                        className="flex-1 rounded-md bg-transparent px-2 py-1 font-medium text-neutral-900 outline-none hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p} className="dark:bg-[#20201E]">
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                    <div className="flex items-center gap-4">
                      <span className="w-24 shrink-0 text-neutral-500 dark:text-neutral-400">
                        Assignee
                      </span>
                      <input
                        type="text"
                        value={selectedTask.assignee}
                        placeholder="Add owner..."
                        onChange={(e) =>
                          updateTask(selectedTask.id, { assignee: e.target.value })
                        }
                        className="flex-1 rounded-md bg-transparent px-2 py-1 text-neutral-900 outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex w-24 shrink-0 items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Due Date</span>
                      </span>
                      <input
                        type="date"
                        value={selectedTask.dueDate}
                        onChange={(e) =>
                          updateTask(selectedTask.id, { dueDate: e.target.value })
                        }
                        className="flex-1 rounded-md bg-transparent px-2 py-1 font-mono tabular-nums text-neutral-900 outline-none hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                    <div className="flex items-start gap-4">
                      <span className="mt-1.5 w-24 shrink-0 text-neutral-500 dark:text-neutral-400">
                        Tags
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          type="text"
                          value={selectedTask.tags}
                          placeholder="Design, Engineering, Launch..."
                          onChange={(e) =>
                            updateTask(selectedTask.id, { tags: e.target.value })
                          }
                          className="w-full rounded-md bg-transparent px-2 py-1 text-neutral-900 outline-none hover:bg-neutral-100 focus:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800"
                        />

                        {/* Active tags with custom color picker + quick tag presets */}
                        <div className="flex flex-wrap items-center gap-1.5 px-2">
                          {parseTaskTags(selectedTask.tags).map((tag) => {
                            const theme = getTaskTagColorTheme(tag, customTagColors);
                            const isEditingColor =
                              editingColorForTag?.toLowerCase() === tag.toLowerCase();
                            return (
                              <div key={tag} className="relative inline-flex items-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingColorForTag((curr) =>
                                      curr?.toLowerCase() === tag.toLowerCase()
                                        ? null
                                        : tag
                                    )
                                  }
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${theme.filterInactiveClass}`}
                                  title={`Click to change color for "${tag}"`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full ${theme.swatchClass}`}
                                  />
                                  <span>{tag}</span>
                                </button>
                                {isEditingColor && (
                                  <div className="absolute left-0 top-full z-30 mt-1 flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-[#242422]">
                                    {TASK_TAG_COLOR_PALETTE.map((c) => (
                                      <button
                                        key={c.key}
                                        type="button"
                                        onClick={() => {
                                          const updated = saveCustomTagColor(tag, c.key);
                                          setCustomTagColors(updated);
                                          setEditingColorForTag(null);
                                        }}
                                        className={`h-4 w-4 rounded-full transition-transform hover:scale-110 ${c.swatchClass} ${
                                          theme.key === c.key
                                            ? 'ring-2 ring-neutral-900 ring-offset-1 dark:ring-white dark:ring-offset-neutral-900'
                                            : ''
                                        }`}
                                        title={c.label}
                                        aria-label={`Set ${tag} color to ${c.label}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Quick preset tags to add with one click */}
                          {['Design', 'Engineering', 'Launch', 'Research', 'Product', 'Bug']
                            .filter(
                              (preset) =>
                                !parseTaskTags(selectedTask.tags)
                                  .map((t) => t.toLowerCase())
                                  .includes(preset.toLowerCase())
                            )
                            .slice(0, 4)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  const existing = parseTaskTags(selectedTask.tags);
                                  updateTask(selectedTask.id, {
                                    tags: [...existing, preset].join(', '),
                                  });
                                }}
                                className="rounded-md border border-dashed border-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-700 dark:border-neutral-700 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
                                title={`Add "${preset}" tag`}
                              >
                                + {preset}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex w-24 shrink-0 items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Google Doc</span>
                      </span>
                      <div className="min-w-0 flex-1 px-2 py-1">
                        {selectedTask.docUrl || selectedTask.docId ? (
                          <a
                            href={
                              selectedTask.docUrl ||
                              `https://docs.google.com/document/d/${selectedTask.docId}/edit`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1.5 font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <span className="truncate">
                              {selectedTask.docUrl ||
                                `https://docs.google.com/document/d/${selectedTask.docId}/edit`}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-neutral-400">
                            Not created yet — link stored in Sheet once created
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unlinked Task Doc Creator Banner (shown when task has no Google Doc yet) */}
                {!selectedTask.docId && (
                  <div className="space-y-3 rounded-xl border border-neutral-200 bg-[#F8F8F7] p-4 dark:border-neutral-800 dark:bg-[#20201E]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {DOC_TEMPLATES.map((tpl) => {
                          const active = getDraftTemplate(selectedTask.id) === tpl.id;
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => applyTemplateToDraft(selectedTask, tpl.id)}
                              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                active
                                  ? 'bg-neutral-900 text-white dark:bg-blue-600'
                                  : 'bg-white text-neutral-600 hover:text-neutral-900 dark:bg-[#191918] dark:text-neutral-400 dark:hover:text-neutral-100'
                              }`}
                            >
                              {tpl.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => onLinkExistingTaskDoc(selectedTask)}
                        className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
                      >
                        <Link2 className="h-3 w-3" />
                        <span>Link Existing Google Doc</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={getDraftTitle(selectedTask)}
                        onChange={(e) =>
                          setDraftTitleMap((prev) => ({
                            ...prev,
                            [selectedTask.id]: e.target.value,
                          }))
                        }
                        placeholder="Google Doc title..."
                        aria-label="New Google Doc title"
                        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onCreateTaskDoc(
                            selectedTask,
                            getDraftTitle(selectedTask),
                            getDraftBlocks(selectedTask)
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        <span>Create & Link Google Doc</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Full Whole-Screen Document Block Editor */}
                {selectedTask.docId && loadingTaskDocIds[selectedTask.id] ? (
                  <div className="space-y-3 rounded-xl border border-neutral-200 bg-[#F8F8F7] p-6 dark:border-neutral-800 dark:bg-[#20201E]">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading document from Google Docs...</span>
                    </div>
                    <div className="h-7 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-4 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                  </div>
                ) : (
                  <>
                    <BlockEditor
                      blocks={
                        selectedTask.docId
                          ? selectedTask.docBlocks && selectedTask.docBlocks.length > 0
                            ? selectedTask.docBlocks
                            : buildTaskDocStarterBlocks(selectedTask, 'blank')
                          : getDraftBlocks(selectedTask)
                      }
                      onChange={(nextBlocks) => {
                        if (selectedTask.docId) {
                          onTaskDocBlocksChange(selectedTask.id, nextBlocks);
                        } else {
                          setDraftBlocksMap((prev) => ({
                            ...prev,
                            [selectedTask.id]: nextBlocks,
                          }));
                        }
                      }}
                      onCreateSubPage={
                        selectedTask.docId && onCreateSubPage
                          ? (title, replaceBlockId) =>
                              onCreateSubPage(
                                selectedTask.docId!,
                                selectedTask.docTitle || selectedTask.title || 'Task Document',
                                title,
                                replaceBlockId
                              )
                          : undefined
                      }
                      onOpenPageDoc={onOpenSubPage}
                    />

                    {selectedTask.docId &&
                      (() => {
                        const taskSubPages = extraDocs.filter(
                          (d) => d.parentDocId === selectedTask.docId
                        );
                        if (taskSubPages.length === 0) return null;
                        return (
                          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                              Sub-Pages inside this Task ({taskSubPages.length})
                            </h3>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              {taskSubPages.map((sub) => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => onOpenSubPage?.(sub.id)}
                                  className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#F8F8F7] px-3.5 py-2.5 text-left transition-colors hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                                >
                                  <div className="flex min-w-0 items-center gap-2.5">
                                    <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                    <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline dark:text-neutral-100">
                                      {sub.title}
                                    </span>
                                  </div>
                                  <span className="text-xs text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 shrink-0">
                                    Open →
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                  </>
                )}
              </div>
            </div>

            {/* Centered Modal when clicking "New Doc" inside a task */}
            <AnimatePresence>
              {showNewDocForTaskId === selectedTask.id && (
                <motion.div
                  key="task-new-doc-modal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="fixed inset-0 z-[45] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
                  onClick={() => setShowNewDocForTaskId(null)}
                >
                  <motion.form
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const chosenTemplate = getDraftTemplate(selectedTask.id);
                      const chosenTitle = getDraftTitle(selectedTask);
                      const nextBlocks = buildTaskDocStarterBlocks(
                        { ...selectedTask, title: chosenTitle },
                        chosenTemplate
                      );
                      onCreateTaskDoc(selectedTask, chosenTitle, nextBlocks);
                      setShowNewDocForTaskId(null);
                    }}
                    className="w-full max-w-md space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                          <FilePlus2 className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            Create New Google Doc for Task
                          </h3>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Creates a fresh Google Doc in Drive, updates this task&apos;s Google Sheet link, and opens it right here.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewDocForTaskId(null)}
                        className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                        aria-label="Close new doc dialog"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Document Title
                      </label>
                      <input
                        type="text"
                        autoFocus
                        value={getDraftTitle(selectedTask)}
                        onChange={(e) =>
                          setDraftTitleMap((prev) => ({
                            ...prev,
                            [selectedTask.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter Google Doc title..."
                        className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Starter Template
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {DOC_TEMPLATES.map((tpl) => {
                          const active = getDraftTemplate(selectedTask.id) === tpl.id;
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => applyTemplateToDraft(selectedTask, tpl.id)}
                              className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                                active
                                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-blue-500 dark:bg-blue-600'
                                  : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300 dark:hover:bg-neutral-800'
                              }`}
                            >
                              {tpl.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowNewDocForTaskId(null)}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        <FilePlus2 className="h-3.5 w-3.5" />
                        <span>Create & Open Doc</span>
                      </button>
                    </div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
