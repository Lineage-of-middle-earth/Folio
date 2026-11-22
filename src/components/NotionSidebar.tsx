import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Calendar,
  ChevronRight,
  EyeOff,
  FilePlus2,
  Files,
  FileText,
  Folder,
  FolderInput,
  FolderMinus,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Kanban,
  LayoutGrid,
  LogOut,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Table2,
  Trash2,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  ProjectFolderGroup,
  ProjectTabView,
  ProjectWorkspace,
  StandalonePage,
  WorkspaceArea,
} from '../types/workspace';

export interface SidebarUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface NotionSidebarProps {
  user: SidebarUserProfile;
  isGuestMode?: boolean;
  projects: ProjectWorkspace[];
  folderGroups: ProjectFolderGroup[];
  standalonePages: StandalonePage[];
  activeArea: WorkspaceArea;
  activeProjectId: string | null;
  activeGroupId: string | null;
  activeStandalonePageId: string | null;
  activeTab: ProjectTabView;
  isOpen: boolean;
  darkMode: boolean;
  onToggleSidebar: () => void;
  onToggleDark: () => void;
  onOpenCommandPalette: () => void;
  onSelectArea: (area: WorkspaceArea) => void;
  onSelectProject: (projectId: string, tab?: ProjectTabView) => void;
  onSelectFolderGroup: (groupId: string) => void;
  onSelectStandalonePage: (pageId: string) => void;
  onCreateProject: (defaultGroupId?: string | null) => void;
  onCreateFolderGroup: (name: string, icon: string) => void;
  onDeleteFolderGroup: (groupId: string) => void;
  onAssignProjectToGroup: (projectId: string, groupId: string | null) => void;
  onCreateStandalonePage: () => void;
  onAddStandalonePageToProject: (projectId: string) => void;
  onRemoveProjectFromWorkspace: (project: ProjectWorkspace) => void;
  onDeleteProjectPermanently: (project: ProjectWorkspace) => void;
  onRemoveStandalonePageFromWorkspace: (page: StandalonePage) => void;
  onDeleteStandalonePagePermanently: (page: StandalonePage) => void;
  onImportFromDrive: () => void;
  onConnectGoogle?: () => void;
  onLogout: () => void;
}

export const NotionSidebar: React.FC<NotionSidebarProps> = ({
  user,
  isGuestMode = false,
  projects,
  folderGroups,
  standalonePages,
  activeArea,
  activeProjectId,
  activeGroupId,
  activeStandalonePageId,
  activeTab,
  isOpen,
  darkMode,
  onToggleSidebar,
  onToggleDark,
  onOpenCommandPalette,
  onSelectArea,
  onSelectProject,
  onSelectFolderGroup,
  onSelectStandalonePage,
  onCreateProject,
  onCreateFolderGroup,
  onDeleteFolderGroup,
  onAssignProjectToGroup,
  onCreateStandalonePage,
  onAddStandalonePageToProject,
  onRemoveProjectFromWorkspace,
  onDeleteProjectPermanently,
  onRemoveStandalonePageFromWorkspace,
  onDeleteStandalonePagePermanently,
  onImportFromDrive,
  onConnectGoogle,
  onLogout,
}) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('📁');

  const toggleExpandProject = (id: string) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !(prev[groupId] ?? true),
    }));
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    onCreateFolderGroup(trimmed, newFolderIcon);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const ungroupedProjects = projects.filter(
    (p) => !p.groupId || !folderGroups.some((g) => g.id === p.groupId)
  );

  const topLevelStandalonePages = standalonePages.filter(
    (pg) => !pg.parentDocId || !standalonePages.some((parent) => parent.id === pg.parentDocId)
  );

  const renderProjectItem = (project: ProjectWorkspace, inFolder = false) => {
    const isSelected =
      activeArea === 'project' && activeProjectId === project.id;
    const isExpanded = expandedProjects[project.id] ?? isSelected;
    const hasPending =
      project.dirtyDoc ||
      project.dirtyTasks ||
      project.tasks.some((t) => t.dirtyTaskDoc) ||
      project.extraDocs.some((d) => d.dirty);
    const isMenuOpen = openMenuProjectId === project.id;

    return (
      <div key={project.id} className="relative">
        <div
          className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors ${
            isSelected
              ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
              : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
          }`}
        >
          <button
            type="button"
            onClick={() => toggleExpandProject(project.id)}
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
            className="flex min-w-0 flex-1 items-center justify-between gap-1.5 py-0.5 text-left"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm">{project.icon}</span>
              <span className="truncate">{project.title}</span>
            </span>
            {hasPending && (
              <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Edited
              </span>
            )}
          </button>

          {/* 3-Dot Project Options Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuPageId(null);
              setOpenMenuProjectId(isMenuOpen ? null : project.id);
            }}
            className={`rounded p-1 text-neutral-400 transition-opacity hover:bg-neutral-300/60 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 ${
              isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Project options (Add page, Move to folder, Remove, Delete)"
            aria-label="Project options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 3-Dot Dropdown Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              className="absolute right-1 top-8 z-40 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
            >
              <button
                type="button"
                onClick={() => {
                  setOpenMenuProjectId(null);
                  onAddStandalonePageToProject(project.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>Add Standalone Page</span>
              </button>

              {folderGroups.length > 0 && (
                <>
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Folder Group
                  </div>
                  {inFolder && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuProjectId(null);
                        onAssignProjectToGroup(project.id, null);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <FolderMinus className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Remove from Folder</span>
                    </button>
                  )}
                  {folderGroups
                    .filter((g) => g.id !== project.groupId)
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => {
                          setOpenMenuProjectId(null);
                          onAssignProjectToGroup(project.id, g.id);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <FolderInput className="h-3.5 w-3.5 text-neutral-500" />
                        <span className="truncate">
                          Move to {g.icon} {g.name}
                        </span>
                      </button>
                    ))}
                </>
              )}

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

              <button
                type="button"
                onClick={() => {
                  setOpenMenuProjectId(null);
                  onRemoveProjectFromWorkspace(project);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                <span>Remove from Here</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpenMenuProjectId(null);
                  onDeleteProjectPermanently(project);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete from Drive</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project Views Sub-tree */}
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
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200/70 px-3 py-3 dark:border-neutral-800">
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
          <div className="flex shrink-0 items-center gap-0.5">
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
            <span className="relative z-10 truncate">
              {isGuestMode ? 'Local Workspace Files' : 'Google Drive Files'}
            </span>
          </button>
        </nav>

        {/* Scrollable Projects, Folders & Standalone Pages */}
        <div className="mt-4 flex-1 overflow-y-auto px-2 pb-4 space-y-5">
          {/* Projects & Folder Groups Section */}
          <div>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Projects & Folders
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput((v) => !v)}
                  className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  title="New folder / project group"
                  aria-label="New folder group"
                >
                  <Folder className="h-3.5 w-3.5" />
                </button>
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
                  onClick={() => onCreateProject(null)}
                  className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  title="New project"
                  aria-label="Create new project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Inline New Folder Creator */}
            <AnimatePresence>
              {showNewFolderInput && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCreateFolderSubmit}
                  className="mt-1.5 overflow-hidden rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-[#191918]"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const icons = ['📁', '🗂️', '🚀', '💼', '🎯', '⚡'];
                        const idx = icons.indexOf(newFolderIcon);
                        setNewFolderIcon(icons[(idx + 1) % icons.length]);
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-neutral-200 bg-neutral-50 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                      title="Click to cycle folder icon"
                    >
                      {newFolderIcon}
                    </button>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder group name..."
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-xs text-neutral-900 outline-none dark:text-neutral-100"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowNewFolderInput(false)}
                      className="rounded px-2 py-1 text-[11px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded bg-neutral-900 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      Create Folder
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="mt-1.5 space-y-1">
              {/* Folder Groups */}
              {folderGroups.map((group) => {
                const groupProjects = projects.filter((p) => p.groupId === group.id);
                const isGroupSelected =
                  activeArea === 'folder-group' && activeGroupId === group.id;
                const isGroupExpanded = expandedGroups[group.id] ?? true;

                return (
                  <div key={group.id} className="space-y-0.5">
                    <div
                      className={`group flex items-center gap-1 rounded-md px-1.5 py-1 text-sm transition-colors ${
                        isGroupSelected
                          ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                          : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpandGroup(group.id)}
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-300/60 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                        title={
                          isGroupExpanded
                            ? 'Collapse projects in folder'
                            : 'Expand projects in folder'
                        }
                      >
                        <motion.span
                          animate={{ rotate: isGroupExpanded ? 90 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="block"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </motion.span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectFolderGroup(group.id)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-1.5 py-0.5 text-left"
                        title="Open folder gallery view"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 text-sm">{group.icon}</span>
                          <span className="truncate font-medium">{group.name}</span>
                        </span>
                        <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                          {groupProjects.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreateProject(group.id);
                        }}
                        className="rounded p-0.5 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-300/60 hover:text-neutral-800 group-hover:opacity-100 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
                        title={`Create new project in "${group.name}"`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolderGroup(group.id);
                        }}
                        className="rounded p-0.5 text-neutral-400 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        title={`Ungroup folder "${group.name}"`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Expanded Projects Below Folder */}
                    <AnimatePresence initial={false}>
                      {isGroupExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-3.5 space-y-0.5 border-l border-neutral-200/80 pl-1.5 dark:border-neutral-800"
                        >
                          {groupProjects.length === 0 ? (
                            <div className="px-2 py-1 text-[11px] text-neutral-400">
                              Empty folder · Click to open gallery
                            </div>
                          ) : (
                            groupProjects.map((proj) => renderProjectItem(proj, true))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Ungrouped Projects */}
              {projects.length === 0 && folderGroups.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-neutral-500 dark:text-neutral-400">
                  No projects yet. Create one or import from Google Drive.
                </div>
              ) : (
                ungroupedProjects.map((project) => renderProjectItem(project, false))
              )}
            </div>
          </div>

          {/* Standalone Pages Section */}
          <div>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Standalone Pages
              </span>
              <button
                type="button"
                onClick={onCreateStandalonePage}
                className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                title="Add new standalone Google Doc page"
                aria-label="Add standalone page"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-1.5 space-y-0.5">
              {topLevelStandalonePages.length === 0 ? (
                <button
                  type="button"
                  onClick={onCreateStandalonePage}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-200"
                >
                  <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>+ Add standalone page</span>
                </button>
              ) : (
                topLevelStandalonePages.map((pg) => {
                  const isSelected =
                    activeArea === 'standalone-page' &&
                    activeStandalonePageId === pg.id;
                  const isMenuOpen = openMenuPageId === pg.id;
                  const childPages = standalonePages.filter(
                    (c) => c.parentDocId === pg.id
                  );

                  return (
                    <div key={pg.id} className="relative">
                      <div
                        className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1 text-sm transition-colors ${
                          isSelected
                            ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                            : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectStandalonePage(pg.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 py-0.5 text-left"
                        >
                          <span className="shrink-0 text-sm">{pg.icon}</span>
                          <span className="truncate">{pg.title}</span>
                          {pg.dirty && (
                            <span className="shrink-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              Edited
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProjectId(null);
                            setOpenMenuPageId(isMenuOpen ? null : pg.id);
                          }}
                          className={`rounded p-1 text-neutral-400 transition-opacity hover:bg-neutral-300/60 hover:text-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100 ${
                            isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          title="Standalone page options"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            className="absolute right-1 top-8 z-40 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuPageId(null);
                                onRemoveStandalonePageFromWorkspace(pg);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                              <span>Remove from Here</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuPageId(null);
                                onDeleteStandalonePagePermanently(pg);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete from Drive</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {childPages.length > 0 && (
                        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-800">
                          {childPages.map((child) => {
                            const isChildSelected =
                              activeArea === 'standalone-page' &&
                              activeStandalonePageId === child.id;
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => onSelectStandalonePage(child.id)}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors ${
                                  isChildSelected
                                    ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                                    : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/60'
                                }`}
                              >
                                <span className="shrink-0">{child.icon}</span>
                                <span className="truncate">{child.title}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Account Controls */}
        <div className="border-t border-neutral-200/80 px-3 py-2.5 dark:border-neutral-800 space-y-2">
          {isGuestMode && onConnectGoogle && (
            <button
              type="button"
              onClick={onConnectGoogle}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <span>Sign in with Google</span>
            </button>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  {user.displayName || 'Connected Account'}
                </span>
                {isGuestMode && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Local
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/70 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              title={isGuestMode ? 'Exit Guest Mode' : 'Sign out'}
              aria-label={isGuestMode ? 'Exit Guest Mode' : 'Sign out'}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </motion.div>
  );
};
