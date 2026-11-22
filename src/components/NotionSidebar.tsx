import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  ChevronRight,
  Files,
  FileText,
  FolderOpen,
  HardDrive,
  Kanban,
  LayoutGrid,
  LogOut,
  Moon,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Table2,
  FolderPlus,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  ProjectTabView,
  ProjectWorkspace,
  WorkspaceArea,
} from '../types/workspace';

interface NotionSidebarProps {
  user: User;
  projects: ProjectWorkspace[];
  activeArea: WorkspaceArea;
  activeProjectId: string | null;
  activeTab: ProjectTabView;
  isOpen: boolean;
  darkMode: boolean;
  onToggleSidebar: () => void;
  onToggleDark: () => void;
  onOpenCommandPalette: () => void;
  onSelectArea: (area: WorkspaceArea) => void;
  onSelectProject: (projectId: string, tab?: ProjectTabView) => void;
  onCreateProject: () => void;
  onImportFromDrive: () => void;
  onLogout: () => void;
}

export const NotionSidebar: React.FC<NotionSidebarProps> = ({
  user,
  projects,
  activeArea,
  activeProjectId,
  activeTab,
  isOpen,
  darkMode,
  onToggleSidebar,
  onToggleDark,
  onOpenCommandPalette,
  onSelectArea,
  onSelectProject,
  onCreateProject,
  onImportFromDrive,
  onLogout,
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <motion.div
      initial={false}
      animate={{
        width: isOpen ? 264 : 0,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-screen shrink-0 overflow-hidden"
      aria-hidden={!isOpen}
    >
      <aside className="flex h-screen w-[264px] flex-col border-r border-neutral-200 bg-[#F8F8F7] text-neutral-800 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-200 select-none">
      {/* Workspace Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-neutral-200/70 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => onSelectArea('overview')}
          className="flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Workspace user'}
              referrerPolicy="no-referrer"
              className="h-6 w-6 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-900 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
              {(user.displayName || user.email || 'F').charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Folio Workspace
            </div>
          </div>
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onToggleDark}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={darkMode ? 'sun' : 'moon'}
                initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
                transition={{ duration: 0.14 }}
                className="block"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="px-2.5 pt-2.5">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-700/80 dark:bg-[#191918] dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search pages & tasks</span>
          </span>
          <kbd className="font-mono text-[10px] text-neutral-400">⌘K</kbd>
        </button>
      </div>

      {/* Core Workspace Navigation */}
      <nav className="mt-3 space-y-0.5 px-2" aria-label="Workspace navigation">
        <button
          type="button"
          onClick={() => onSelectArea('overview')}
          className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            activeArea === 'overview'
              ? 'font-medium text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
          }`}
        >
          {activeArea === 'overview' && (
            <motion.span
              layoutId="sidebar-active-nav"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-md bg-neutral-200/80 dark:bg-neutral-800"
            />
          )}
          <LayoutGrid className="relative z-10 h-4 w-4 shrink-0" />
          <span className="relative z-10 truncate">Home & Overview</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectArea('daily-planner')}
          className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            activeArea === 'daily-planner'
              ? 'font-medium text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
          }`}
        >
          {activeArea === 'daily-planner' && (
            <motion.span
              layoutId="sidebar-active-nav"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-md bg-neutral-200/80 dark:bg-neutral-800"
            />
          )}
          <Calendar className="relative z-10 h-4 w-4 shrink-0" />
          <span className="relative z-10 truncate">Daily Tasks & Habits</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectArea('sync-hub')}
          className={`relative flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            activeArea === 'sync-hub'
              ? 'font-medium text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
          }`}
        >
          {activeArea === 'sync-hub' && (
            <motion.span
              layoutId="sidebar-active-nav"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-md bg-neutral-200/80 dark:bg-neutral-800"
            />
          )}
          <span className="relative z-10 flex items-center gap-2.5 truncate">
            <RefreshCw className="h-4 w-4 shrink-0" />
            <span className="truncate">Workspace Sync Hub</span>
          </span>
          {projects.some(
            (p) =>
              p.dirtyDoc ||
              p.dirtyTasks ||
              p.tasks.some((t) => t.dirtyTaskDoc) ||
              p.extraDocs.some((d) => d.dirty)
          ) && (
            <span className="relative z-10 font-mono text-[11px] tabular-nums text-amber-600 dark:text-amber-400">
              {
                projects.filter(
                  (p) =>
                    p.dirtyDoc ||
                    p.dirtyTasks ||
                    p.tasks.some((t) => t.dirtyTaskDoc) ||
                    p.extraDocs.some((d) => d.dirty)
                ).length
              }
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectArea('drive-browser')}
          className={`relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
            activeArea === 'drive-browser'
              ? 'font-medium text-neutral-900 dark:text-neutral-100'
              : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100'
          }`}
        >
          {activeArea === 'drive-browser' && (
            <motion.span
              layoutId="sidebar-active-nav"
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 rounded-md bg-neutral-200/80 dark:bg-neutral-800"
            />
          )}
          <HardDrive className="relative z-10 h-4 w-4 shrink-0" />
          <span className="relative z-10 truncate">Google Drive Files</span>
        </button>
      </nav>

      {/* Projects Tree */}
      <div className="mt-5 flex items-center justify-between px-4">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Projects
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onImportFromDrive}
            className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Import existing Drive folder, Sheet, or Doc"
            aria-label="Import from Google Drive"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCreateProject}
            className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="New project"
            aria-label="Create new project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {projects.length === 0 ? (
          <div className="px-2.5 py-3 text-xs text-neutral-500 dark:text-neutral-400">
            No projects yet. Create one or import from Google Drive.
          </div>
        ) : (
          projects.map((project) => {
            const isSelected =
              activeArea === 'project' && activeProjectId === project.id;
            const isExpanded =
              expandedProjects[project.id] ?? isSelected;
            const hasPending =
              project.dirtyDoc ||
              project.dirtyTasks ||
              project.tasks.some((t) => t.dirtyTaskDoc) ||
              project.extraDocs.some((d) => d.dirty);

            return (
              <div key={project.id}>
                <div
                  className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors ${
                    isSelected
                      ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(project.id)}
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-300/60 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    aria-label={`Toggle ${project.title} views`}
                  >
                    <motion.span
                      animate={{ rotate: isExpanded ? 90 : 0 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="block"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </motion.span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProject(project.id, 'page')}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 py-0.5 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-sm">{project.icon}</span>
                      <span className="truncate">{project.title}</span>
                    </span>
                    {hasPending && (
                      <span className="shrink-0 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        Edited
                      </span>
                    )}
                  </button>
                </div>

                <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id, 'page')}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected && activeTab === 'page'
                          ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Page & Brief</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id, 'docs')}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected && activeTab === 'docs'
                          ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Files className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Documents</span>
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                        {(project.docId ? 1 : 0) + project.extraDocs.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id, 'board')}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected && activeTab === 'board'
                          ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Kanban className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Task Board</span>
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                        {project.tasks.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id, 'table')}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected && activeTab === 'table'
                          ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <Table2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Sheet Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectProject(project.id, 'files')}
                      className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                        isSelected && activeTab === 'files'
                          ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Drive Files</span>
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                        {project.driveFiles.length}
                      </span>
                    </button>
                  </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Account Controls */}
      <div className="border-t border-neutral-200/80 px-3 py-2.5 dark:border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {user.displayName || 'Connected Account'}
            </div>
            <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
              {user.email}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
    </motion.div>
  );
};
