import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  EyeOff,
  FilePlus2,
  Files,
  FileSpreadsheet,
  FileText,
  FolderInput,
  FolderMinus,
  FolderOpen,
  Kanban,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ProjectFolderGroup,
  ProjectTabView,
  ProjectWorkspace,
} from '../types/workspace';
import { getCoverPresetByIndex } from '../lib/coverAssets';

interface FolderGalleryViewProps {
  group: ProjectFolderGroup;
  allGroups: ProjectFolderGroup[];
  projectsInGroup: ProjectWorkspace[];
  availableProjects: ProjectWorkspace[];
  fullWidth?: boolean;
  onRenameGroup: (groupId: string, newName: string) => void;
  onChangeGroupIcon: (groupId: string, icon: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenProject: (projectId: string, tab?: ProjectTabView) => void;
  onCreateProjectInGroup: (groupId: string) => void;
  onAssignProjectToGroup: (projectId: string, groupId: string | null) => void;
  onAddStandalonePageToProject: (projectId: string) => void;
  onRemoveProjectFromWorkspace: (project: ProjectWorkspace) => void;
  onDeleteProjectPermanently: (project: ProjectWorkspace) => void;
  hasProjectDirty: (project: ProjectWorkspace) => boolean;
}

const FOLDER_ICONS = ['📁', '🗂️', '🚀', '💼', '🎯', '⚡', '🌿', '🔬'];

export const FolderGalleryView: React.FC<FolderGalleryViewProps> = ({
  group,
  allGroups,
  projectsInGroup,
  availableProjects,
  fullWidth = false,
  onRenameGroup,
  onChangeGroupIcon,
  onDeleteGroup,
  onOpenProject,
  onCreateProjectInGroup,
  onAssignProjectToGroup,
  onAddStandalonePageToProject,
  onRemoveProjectFromWorkspace,
  onDeleteProjectPermanently,
  hasProjectDirty,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const [expandedBreakdownIds, setExpandedBreakdownIds] = useState<Record<string, boolean>>({});

  const totalTasks = projectsInGroup.reduce((acc, p) => acc + p.tasks.length, 0);
  const completedTasks = projectsInGroup.reduce(
    (acc, p) => acc + p.tasks.filter((t) => t.status === 'Done').length,
    0
  );
  const totalDocs = projectsInGroup.reduce(
    (acc, p) => acc + (p.docId ? 1 : 0) + p.extraDocs.length,
    0
  );

  const toggleProjectBreakdown = (projectId: string) => {
    setExpandedBreakdownIds((prev) => ({
      ...prev,
      [projectId]: !(prev[projectId] ?? true),
    }));
  };

  return (
    <div
      className={
        fullWidth
          ? 'w-full max-w-none space-y-8 px-4 py-8 sm:px-6 transition-all duration-200'
          : 'mx-auto max-w-[1100px] space-y-8 px-6 py-8 lg:px-10 transition-all duration-200'
      }
    >
      {/* Folder Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIconPicker((v) => !v)}
              className="flex h-13 w-13 items-center justify-center rounded-xl border border-neutral-200 bg-[#F8F8F7] text-2xl shadow-2xs transition-transform hover:scale-105 dark:border-neutral-800 dark:bg-[#20201E]"
              title="Change folder icon"
            >
              {group.icon}
            </button>
            <AnimatePresence>
              {showIconPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  className="absolute left-0 top-full z-30 mt-2 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-[#242422]"
                >
                  {FOLDER_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => {
                        onChangeGroupIcon(group.id, ic);
                        setShowIconPicker(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {ic}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Project Folder Group · Gallery View
            </div>
            <input
              type="text"
              value={group.name}
              onChange={(e) => onRenameGroup(group.id, e.target.value)}
              aria-label="Folder name"
              className="mt-0.5 w-full bg-transparent font-display text-2xl font-semibold tracking-tight text-neutral-900 outline-none focus:underline dark:text-neutral-50 sm:text-3xl"
            />
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="tabular-nums font-medium text-neutral-700 dark:text-neutral-300">
                {projectsInGroup.length} project{projectsInGroup.length === 1 ? '' : 's'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {completedTasks}/{totalTasks} tasks completed
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{totalDocs} Google Docs</span>
            </div>
          </div>
        </div>

        {/* Folder Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAssignMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <FolderInput className="h-3.5 w-3.5 text-neutral-500" />
              <span>Add Existing Project</span>
            </button>

            <AnimatePresence>
              {showAssignMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  className="absolute right-0 top-full z-30 mt-1.5 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-medium text-neutral-400">
                    Move project into "{group.name}"
                  </div>
                  {availableProjects.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-neutral-500">
                      All workspace projects are already in this folder.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {availableProjects.map((proj) => (
                        <button
                          key={proj.id}
                          type="button"
                          onClick={() => {
                            onAssignProjectToGroup(proj.id, group.id);
                            setShowAssignMenu(false);
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span>{proj.icon}</span>
                            <span className="truncate font-medium">{proj.title}</span>
                          </span>
                          <Plus className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => onCreateProjectInGroup(group.id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project in Folder</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteGroup(group.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 dark:hover:text-red-400 whitespace-nowrap shrink-0"
            title="Ungroup folder (keeps all projects in workspace)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Ungroup Folder</span>
          </button>
        </div>
      </div>

      {/* Gallery Grid of Projects in Folder */}
      {projectsInGroup.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-16 text-center dark:border-neutral-800 dark:bg-[#20201E]">
          <FolderOpen className="h-9 w-9 text-neutral-400" />
          <h2 className="mt-3 font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            No projects in "{group.name}" yet
          </h2>
          <p className="mt-1 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
            Create a new Google Workspace project inside this folder or add an existing project to view them in a gallery layout.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onCreateProjectInGroup(group.id)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Project in Folder</span>
            </button>
            {availableProjects.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAssignMenu(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
              >
                <FolderInput className="h-3.5 w-3.5" />
                <span>Add Existing Project</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-4 flex items-baseline gap-2">
              <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Projects
              </h2>
              <span className="font-mono text-xs tabular-nums text-neutral-400">
                {projectsInGroup.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projectsInGroup.map((p, idx) => {
                const done = p.tasks.filter((t) => t.status === 'Done').length;
                const progressPct =
                  p.tasks.length > 0 ? Math.round((done / p.tasks.length) * 100) : 0;
                const fallback = getCoverPresetByIndex(idx).fallbackGradient;
                const isMenuOpen = openMenuProjectId === p.id;
                const docCount = (p.docId ? 1 : 0) + p.extraDocs.length;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.04, 0.2) }}
                    className="group relative flex flex-col overflow-visible rounded-xl border border-neutral-200/80 bg-white transition-all hover:border-neutral-300 dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                  >
                    {/* Cover Banner */}
                    <div
                      onClick={() => onOpenProject(p.id, 'page')}
                      className="h-28 w-full cursor-pointer overflow-hidden rounded-t-xl border-b border-neutral-200/70 dark:border-neutral-800"
                      style={{ background: fallback }}
                    >
                      {p.coverUrl && (
                        <img
                          src={p.coverUrl}
                          alt={p.title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      )}
                    </div>

                    {/* 3-Dot Project Action Menu on Card */}
                    <div className="absolute right-2.5 top-2.5 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId(isMenuOpen ? null : p.id);
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 text-neutral-700 shadow-xs backdrop-blur-xs transition-opacity hover:bg-white dark:bg-neutral-900/90 dark:text-neutral-200 ${
                          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title="Project options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                            className="absolute right-0 top-full z-30 mt-1.5 w-52 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                onAddStandalonePageToProject(p.id);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>New Page</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                onAssignProjectToGroup(p.id, null);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              <FolderMinus className="h-3.5 w-3.5 text-neutral-500" />
                              <span>Remove from Folder</span>
                            </button>

                            {allGroups
                              .filter((g) => g.id !== group.id)
                              .map((otherGroup) => (
                                <button
                                  key={otherGroup.id}
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuProjectId(null);
                                    onAssignProjectToGroup(p.id, otherGroup.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                                >
                                  <FolderInput className="h-3.5 w-3.5 text-neutral-500" />
                                  <span className="truncate">
                                    Move to {otherGroup.icon} {otherGroup.name}
                                  </span>
                                </button>
                              ))}

                            <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                onRemoveProjectFromWorkspace(p);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                            >
                              <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                              <span>Hide from Workspace</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuProjectId(null);
                                onDeleteProjectPermanently(p);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete from Drive</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Card Body */}
                    <div
                      onClick={() => onOpenProject(p.id, 'page')}
                      className="flex flex-1 cursor-pointer flex-col justify-between p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{p.icon}</span>
                          <h3 className="truncate font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {p.title}
                          </h3>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                          <div className="flex items-center gap-1.5 tabular-nums">
                            <span>
                              {done}/{p.tasks.length} tasks
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {docCount} {docCount === 1 ? 'doc' : 'docs'}
                            </span>
                            {hasProjectDirty(p) && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  Unsynced
                                </span>
                              </>
                            )}
                          </div>

                          {p.driveFolderUrl && (
                            <a
                              href={p.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-neutral-400 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {p.tasks.length > 0 && (
                          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div
                              className="h-full rounded-full bg-emerald-600 transition-all duration-300 dark:bg-emerald-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Expanded Projects Breakdown Below */}
          <div className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
            <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              All Projects in "{group.name}" — Expanded Details
            </h2>
            <div className="space-y-3">
              {projectsInGroup.map((p) => {
                const isExpanded = expandedBreakdownIds[p.id] ?? true;
                const done = p.tasks.filter((t) => t.status === 'Done').length;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-neutral-200 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleProjectBreakdown(p.id)}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        )}
                        <span className="text-base">{p.icon}</span>
                        <span className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {p.title}
                        </span>
                        <span className="text-xs text-neutral-500 tabular-nums">
                          ({done}/{p.tasks.length} tasks · {(p.docId ? 1 : 0) + p.extraDocs.length} docs)
                        </span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAddStandalonePageToProject(p.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
                        >
                          <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          <span>+ Page</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenProject(p.id, 'page')}
                          className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          <span>Open Project</span>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden border-t border-neutral-200/80 px-4 py-3 dark:border-neutral-800"
                        >
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {/* Pages & Documents */}
                            <div>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                Pages & Documents
                              </div>
                              <div className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenProject(p.id, 'page')}
                                  className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <FileText className="h-3.5 w-3.5 text-blue-600" />
                                    <span className="truncate font-medium">
                                      {p.docTitle || `${p.title} — Brief`}
                                    </span>
                                  </span>
                                  <span className="text-[11px] text-neutral-400">Brief</span>
                                </button>
                                {p.extraDocs.map((doc) => (
                                  <button
                                    key={doc.id}
                                    type="button"
                                    onClick={() => onOpenProject(p.id, 'docs')}
                                    className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <Files className="h-3.5 w-3.5 text-neutral-500" />
                                      <span className="truncate">{doc.title}</span>
                                    </span>
                                    <span className="text-[11px] text-neutral-400">Page</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Active Tasks */}
                            <div>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                                Tasks ({p.tasks.length})
                              </div>
                              {p.tasks.length === 0 ? (
                                <div className="text-xs text-neutral-400">No tasks in sheet.</div>
                              ) : (
                                <div className="space-y-1">
                                  {p.tasks.slice(0, 4).map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => onOpenProject(p.id, 'board')}
                                      className="flex w-full items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-100 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <Kanban className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                        <span className="truncate">{t.title}</span>
                                      </span>
                                      <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                                        {t.status}
                                      </span>
                                    </button>
                                  ))}
                                  {p.tasks.length > 4 && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenProject(p.id, 'board')}
                                      className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                      View all {p.tasks.length} tasks →
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
