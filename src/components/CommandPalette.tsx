import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, Files, FileText, Kanban, LayoutGrid, RefreshCw, Search, HardDrive } from 'lucide-react';
import { ProjectTabView, ProjectWorkspace, WorkspaceArea } from '../types/workspace';

interface CommandPaletteProps {
  isOpen: boolean;
  projects: ProjectWorkspace[];
  onClose: () => void;
  onSelectArea: (area: WorkspaceArea) => void;
  onSelectProject: (projectId: string, tab: ProjectTabView) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  projects,
  onClose,
  onSelectArea,
  onSelectProject,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries: Array<{
      id: string;
      label: string;
      subtitle: string;
      icon: React.ReactNode;
      action: () => void;
    }> = [
      {
        id: 'nav-overview',
        label: 'Home & Workspace Overview',
        subtitle: 'Workspace',
        icon: <LayoutGrid className="h-4 w-4 text-neutral-500" />,
        action: () => onSelectArea('overview'),
      },
      {
        id: 'nav-daily-planner',
        label: 'Daily Tasks, Habits & Notes Calendar',
        subtitle: 'Local Planner · Work · Personal · Custom Tags',
        icon: <Calendar className="h-4 w-4 text-blue-600" />,
        action: () => onSelectArea('daily-planner'),
      },
      {
        id: 'nav-sync',
        label: 'Workspace Sync Hub',
        subtitle: 'Drive · Sheets · Docs',
        icon: <RefreshCw className="h-4 w-4 text-neutral-500" />,
        action: () => onSelectArea('sync-hub'),
      },
      {
        id: 'nav-drive',
        label: 'Google Drive Explorer',
        subtitle: 'Files',
        icon: <HardDrive className="h-4 w-4 text-neutral-500" />,
        action: () => onSelectArea('drive-browser'),
      },
    ];

    for (const project of projects) {
      entries.push({
        id: `proj-page-${project.id}`,
        label: `${project.icon} ${project.title} — Brief & Page`,
        subtitle: 'Google Doc Page',
        icon: <FileText className="h-4 w-4 text-blue-600" />,
        action: () => onSelectProject(project.id, 'page'),
      });
      entries.push({
        id: `proj-docs-${project.id}`,
        label: `${project.icon} ${project.title} — Documents`,
        subtitle: `${(project.docId ? 1 : 0) + project.extraDocs.length} doc pages`,
        icon: <Files className="h-4 w-4 text-blue-500" />,
        action: () => onSelectProject(project.id, 'docs'),
      });
      for (const extraDoc of project.extraDocs) {
        entries.push({
          id: `extradoc-${project.id}-${extraDoc.id}`,
          label: extraDoc.title,
          subtitle: `${project.title} · Document Page`,
          icon: <FileText className="h-3.5 w-3.5 text-neutral-400" />,
          action: () => onSelectProject(project.id, 'docs'),
        });
      }
      entries.push({
        id: `proj-board-${project.id}`,
        label: `${project.icon} ${project.title} — Task Board`,
        subtitle: `${project.tasks.length} tasks in Sheet`,
        icon: <Kanban className="h-4 w-4 text-emerald-600" />,
        action: () => onSelectProject(project.id, 'board'),
      });
      for (const task of project.tasks) {
        entries.push({
          id: `task-${project.id}-${task.id}`,
          label: task.title,
          subtitle: `${project.title} · ${task.status} · ${task.priority}`,
          icon: <Kanban className="h-3.5 w-3.5 text-neutral-400" />,
          action: () => onSelectProject(project.id, 'board'),
        });
      }
    }

    if (!q) return entries.slice(0, 14);
    return entries
      .filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.subtitle.toLowerCase().includes(q)
      )
      .slice(0, 16);
  }, [query, projects, onSelectArea, onSelectProject]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="command-palette-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 pt-20 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            key="command-palette-panel"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex items-center gap-2.5 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && items.length > 0) {
                items[0].action();
                onClose();
              }
            }}
            placeholder="Jump to project, task, or Google Workspace view..."
            className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-[10px] text-neutral-400 dark:border-neutral-700">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              No matching pages or tasks found.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {item.icon}
                  <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">
                    {item.label}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] text-neutral-500 dark:text-neutral-400">
                  {item.subtitle}
                </span>
              </button>
            ))
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
