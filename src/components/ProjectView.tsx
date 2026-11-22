import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  Files,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Kanban,
  Link2,
  ListChecks,
  RefreshCw,
  Table2,
} from 'lucide-react';
import {
  DocBlock,
  DriveFileItem,
  ProjectDocPage,
  ProjectTabView,
  ProjectWorkspace,
  TaskItem,
} from '../types/workspace';
import { COVER_PRESETS } from '../lib/coverAssets';
import { BlockEditor } from './BlockEditor';
import { DocumentsHub } from './DocumentsHub';
import { TaskDatabase } from './TaskDatabase';
import { DriveFilesPanel } from './DriveFilesPanel';

interface ProjectViewProps {
  project: ProjectWorkspace;
  activeTab: ProjectTabView;
  isPulling: boolean;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  onToggleAutoSync: () => void;
  onTabChange: (tab: ProjectTabView) => void;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string) => void;
  onCoverChange: (coverUrl: string | null) => void;
  onBlocksChange: (blocks: DocBlock[]) => void;
  onTasksChange: (tasks: TaskItem[]) => void;
  onTaskDocBlocksChange: (taskId: string, blocks: DocBlock[]) => void;
  onCreateTaskDoc: (task: TaskItem, docTitle: string, blocks: DocBlock[]) => void;
  onCreateMissingTaskDocs: () => void;
  onLinkExistingTaskDoc: (task: TaskItem) => void;
  onLoadTaskDoc: (task: TaskItem) => Promise<void>;
  onPullTaskDoc: (task: TaskItem) => Promise<void>;
  onPushTaskDoc: (task: TaskItem) => void;
  loadingTaskDocIds: Record<string, boolean>;
  syncingTaskDocIds: Record<string, boolean>;
  selectedExtraDocId: string | null;
  onSelectExtraDocId: (docId: string | null) => void;
  loadingExtraDocIds: Record<string, boolean>;
  syncingExtraDocIds: Record<string, boolean>;
  onCreateStandaloneDoc: (title: string, blocks: DocBlock[]) => void;
  onLoadExtraDoc: (doc: ProjectDocPage) => Promise<void>;
  onPullExtraDoc: (doc: ProjectDocPage) => Promise<void>;
  onPushExtraDoc: (doc: ProjectDocPage) => void;
  onExtraDocBlocksChange: (docId: string, blocks: DocBlock[]) => void;
  onLinkExtraDoc: () => void;
  onCreateSubPage: (
    parentTarget:
      | { kind: 'brief' }
      | { kind: 'extraDoc'; docId: string }
      | { kind: 'task'; taskId: string },
    parentDocId: string,
    parentTitle: string,
    title: string,
    replaceBlockId?: string
  ) => void;
  onOpenSubPage: (docId: string) => void;
  onBackToParent: (parentDocId: string) => void;
  requestedTaskId: string | null;
  onClearRequestedTaskId: () => void;
  onRequestOpenTaskDoc: (taskId: string) => void;
  onPullFromWorkspace: () => void;
  onPushToWorkspace: () => void;
  onRefreshDriveFolder: () => void;
  onUploadFile: (file: File) => void;
  onLinkExistingFile: () => void;
  onRenameFile: (file: DriveFileItem, newName: string) => void;
  onTrashFile: (file: DriveFileItem) => void;
  fullWidth?: boolean;
}

const QUICK_ICONS = ['📋', '📐', '🗂️', '🧭', '📦', '⚡', '🌿', '🔬'];

export const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  activeTab,
  isPulling,
  isSyncing,
  autoSyncEnabled,
  onToggleAutoSync,
  onTabChange,
  onTitleChange,
  onIconChange,
  onCoverChange,
  onBlocksChange,
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
  selectedExtraDocId,
  onSelectExtraDocId,
  loadingExtraDocIds,
  syncingExtraDocIds,
  onCreateStandaloneDoc,
  onLoadExtraDoc,
  onPullExtraDoc,
  onPushExtraDoc,
  onExtraDocBlocksChange,
  onLinkExtraDoc,
  onCreateSubPage,
  onOpenSubPage,
  onBackToParent,
  requestedTaskId,
  onClearRequestedTaskId,
  onRequestOpenTaskDoc,
  onPullFromWorkspace,
  onPushToWorkspace,
  onRefreshDriveFolder,
  onUploadFile,
  onLinkExistingFile,
  onRenameFile,
  onTrashFile,
  fullWidth = false,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [openCreatorSignal, setOpenCreatorSignal] = useState(0);

  const hasPendingChanges =
    project.dirtyDoc ||
    project.dirtyTasks ||
    project.tasks.some((t) => Boolean(t.dirtyTaskDoc)) ||
    project.extraDocs.some((d) => Boolean(d.dirty));
  const doneCount = project.tasks.filter((t) => t.status === 'Done').length;

  const cycleCover = () => {
    setShowCoverPicker((prev) => !prev);
  };

  return (
    <div className="min-h-full pb-20">
      {/* Notion-Style Cover Header */}
      <AnimatePresence initial={false}>
      {project.coverUrl ? (
        <motion.div
          key="project-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="group relative h-44 w-full overflow-hidden border-b border-neutral-200 dark:border-neutral-800 sm:h-52"
          style={{ background: COVER_PRESETS[0].fallbackGradient }}
        >
          <motion.img
            key={project.coverUrl}
            initial={{ opacity: 0.6, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            src={project.coverUrl}
            alt={`${project.title} cover`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-3 right-6 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={cycleCover}
              className="rounded-md border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
            >
              Change cover
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setShowCoverPicker(false);
                onCoverChange(null);
              }}
              className="rounded-md border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
            >
              Hide
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="add-cover-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={
            fullWidth
              ? 'w-full max-w-none px-4 pt-6 sm:px-6'
              : 'mx-auto max-w-[960px] px-6 pt-6 lg:px-10'
          }
        >
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onCoverChange(COVER_PRESETS[0].url)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Add cover</span>
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showCoverPicker && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className={
            fullWidth
              ? 'w-full max-w-none px-4 pt-3 sm:px-6'
              : 'mx-auto max-w-[960px] px-6 pt-3 lg:px-10'
          }
        >
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-[#20201E]">
            {COVER_PRESETS.map((preset) => (
              <motion.button
                key={preset.id}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  onCoverChange(preset.url);
                  setShowCoverPicker(false);
                }}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 p-1 pr-2.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  referrerPolicy="no-referrer"
                  className="h-7 w-11 rounded object-cover"
                />
                <span>{preset.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main Page Container */}
      <div
        className={
          fullWidth
            ? 'w-full max-w-none px-4 sm:px-6 transition-all duration-200'
            : 'mx-auto max-w-[960px] px-6 lg:px-10 transition-all duration-200'
        }
      >
        {/* Icon + Title Header */}
        <div className={project.coverUrl ? '-mt-7 relative z-10' : 'pt-4'}>
          <div className="relative inline-block">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowIconPicker((prev) => !prev)}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-200 bg-white text-3xl shadow-xs dark:border-neutral-800 dark:bg-[#20201E]"
              title="Change page icon"
              aria-label="Change page icon"
            >
              {project.icon}
            </motion.button>
            <AnimatePresence>
            {showIconPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-0 top-full z-20 mt-2 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-[#242422]"
              >
                {QUICK_ICONS.map((em) => (
                  <motion.button
                    key={em}
                    type="button"
                    whileHover={{ scale: 1.12 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      onIconChange(em);
                      setShowIconPicker(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {em}
                  </motion.button>
                ))}
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          <input
            type="text"
            value={project.title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label="Project title"
            className="mt-3 w-full bg-transparent font-display text-3xl font-semibold tracking-tight text-neutral-900 outline-none dark:text-neutral-50 sm:text-4xl"
          />
        </div>

        {/* Notion-Style Inline Workspace Properties */}
        <div className="mt-4 divide-y divide-neutral-200/80 border-y border-neutral-200/80 text-xs dark:divide-neutral-800 dark:border-neutral-800">
          <div className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-12 sm:items-center">
            <span className="text-neutral-500 dark:text-neutral-400 sm:col-span-3">
              Google Drive
            </span>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-9">
              {project.driveFolderUrl ? (
                <a
                  href={project.driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-neutral-800 hover:underline dark:text-neutral-200"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                  <span>{project.driveFolderName || project.title}</span>
                  <ExternalLink className="h-3 w-3 text-neutral-400" />
                </a>
              ) : (
                <span className="text-neutral-400">Standalone link</span>
              )}
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                /
              </span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {project.driveFiles.length} file(s)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-12 sm:items-center">
            <span className="text-neutral-500 dark:text-neutral-400 sm:col-span-3">
              Connected Sheet
            </span>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-9">
              {project.sheetUrl ? (
                <a
                  href={project.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-neutral-800 hover:underline dark:text-neutral-200"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{project.sheetTitle || 'Tasks Sheet'}</span>
                  <ExternalLink className="h-3 w-3 text-neutral-400" />
                </a>
              ) : (
                <span className="text-neutral-400">No Sheet linked</span>
              )}
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                ·
              </span>
              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                {doneCount}/{project.tasks.length} tasks done
              </span>
              <button
                type="button"
                onClick={onLinkExistingFile}
                className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                <Link2 className="h-3 w-3" />
                <span>Switch Sheet / Doc</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-12 sm:items-center">
            <span className="text-neutral-500 dark:text-neutral-400 sm:col-span-3">
              Connected Doc
            </span>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-9">
              {project.docUrl ? (
                <a
                  href={project.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-neutral-800 hover:underline dark:text-neutral-200"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>{project.docTitle || 'Project Brief'}</span>
                  <ExternalLink className="h-3 w-3 text-neutral-400" />
                </a>
              ) : (
                <span className="text-neutral-400">No Doc linked</span>
              )}
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                ·
              </span>
              {isSyncing ? (
                <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Syncing to Workspace...</span>
                </span>
              ) : hasPendingChanges ? (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {autoSyncEnabled ? 'Auto-sync scheduled' : 'Unsynced local edits'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    Synced{' '}
                    {project.lastSyncedAt
                      ? new Date(project.lastSyncedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* View Switcher & Sync Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800/80">
            {(
              [
                { id: 'page', label: 'Page & Brief', icon: <FileText className="h-3.5 w-3.5" /> },
                { id: 'docs', label: 'Documents', icon: <Files className="h-3.5 w-3.5" /> },
                { id: 'board', label: 'Board', icon: <Kanban className="h-3.5 w-3.5" /> },
                { id: 'table', label: 'Table', icon: <Table2 className="h-3.5 w-3.5" /> },
                { id: 'list', label: 'List', icon: <ListChecks className="h-3.5 w-3.5" /> },
                { id: 'files', label: 'Drive Files', icon: <FolderOpen className="h-3.5 w-3.5" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.span
                    layoutId={`project-tab-pill-${project.id}`}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-md bg-white shadow-xs dark:bg-[#191918]"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onTabChange('docs');
                setOpenCreatorSignal((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              title="Create a new standalone Google Doc page in this project"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>New Doc Page</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onToggleAutoSync}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                autoSyncEnabled
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800'
              }`}
              title="Toggle automatic background sync to Google Sheets and Docs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{autoSyncEnabled ? 'Auto-Sync: On' : 'Auto-Sync: Off'}</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onPullFromWorkspace}
              disabled={isPulling || isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              title="Pull latest changes from Google Sheets and Google Docs"
            >
              {isPulling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
              <span>Pull</span>
            </motion.button>

            {!autoSyncEnabled && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onPushToWorkspace}
                disabled={!hasPendingChanges || isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-35 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                <span>Sync Now</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Active View Content */}
        <div className="mt-7">
          <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'page' && (
            <motion.div
              key="tab-page"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-10"
            >
              <BlockEditor
                blocks={project.blocks}
                onChange={onBlocksChange}
                onCreateSubPage={
                  project.docId
                    ? (title, replaceBlockId) =>
                        onCreateSubPage(
                          { kind: 'brief' },
                          project.docId!,
                          project.docTitle || `${project.title} — Brief`,
                          title,
                          replaceBlockId
                        )
                    : undefined
                }
                onOpenPageDoc={onOpenSubPage}
              />

              {project.docId &&
                (() => {
                  const briefSubPages = project.extraDocs.filter(
                    (d) => d.parentDocId === project.docId
                  );
                  if (briefSubPages.length === 0) return null;
                  return (
                    <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Sub-Pages inside Brief ({briefSubPages.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {briefSubPages.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onOpenSubPage(sub.id)}
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

              {/* Inline Notion Database Embed inside Page */}
              <div className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Project Tasks Database
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Synced with Google Sheets · Click any task to inspect or drag across columns
                    </p>
                  </div>
                </div>
                <TaskDatabase
                  tasks={project.tasks}
                  viewMode="board"
                  onViewModeChange={(mode) => onTabChange(mode)}
                  onTasksChange={onTasksChange}
                  onTaskDocBlocksChange={onTaskDocBlocksChange}
                  onCreateTaskDoc={onCreateTaskDoc}
                  onCreateMissingTaskDocs={onCreateMissingTaskDocs}
                  onLinkExistingTaskDoc={onLinkExistingTaskDoc}
                  onLoadTaskDoc={onLoadTaskDoc}
                  onPullTaskDoc={onPullTaskDoc}
                  onPushTaskDoc={onPushTaskDoc}
                  loadingTaskDocIds={loadingTaskDocIds}
                  syncingTaskDocIds={syncingTaskDocIds}
                  autoSyncEnabled={autoSyncEnabled}
                  sheetTitle={project.sheetTitle}
                  sheetUrl={project.sheetUrl}
                  requestedTaskId={requestedTaskId}
                  onClearRequestedTaskId={onClearRequestedTaskId}
                  extraDocs={project.extraDocs}
                  onCreateSubPage={(parentDocId, parentTitle, title, replaceBlockId) => {
                    const parentTask = project.tasks.find((t) => t.docId === parentDocId);
                    if (!parentTask) return;
                    onCreateSubPage(
                      { kind: 'task', taskId: parentTask.id },
                      parentDocId,
                      parentTitle,
                      title,
                      replaceBlockId
                    );
                  }}
                  onOpenSubPage={onOpenSubPage}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="tab-docs"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <DocumentsHub
                project={project}
                autoSyncEnabled={autoSyncEnabled}
                loadingDocIds={loadingExtraDocIds}
                syncingDocIds={syncingExtraDocIds}
                selectedDocId={selectedExtraDocId}
                onSelectDocId={onSelectExtraDocId}
                openCreatorSignal={openCreatorSignal}
                onCreateNewDoc={onCreateStandaloneDoc}
                onSelectBrief={() => onTabChange('page')}
                onOpenTaskDoc={onRequestOpenTaskDoc}
                onLoadDoc={onLoadExtraDoc}
                onPullDoc={onPullExtraDoc}
                onPushDoc={onPushExtraDoc}
                onDocBlocksChange={onExtraDocBlocksChange}
                onLinkExistingDoc={onLinkExtraDoc}
                onCreateSubPage={(parentDocId, parentTitle, title, replaceBlockId) =>
                  onCreateSubPage(
                    { kind: 'extraDoc', docId: parentDocId },
                    parentDocId,
                    parentTitle,
                    title,
                    replaceBlockId
                  )
                }
                onBackToParent={onBackToParent}
              />
            </motion.div>
          )}

          {(activeTab === 'board' ||
            activeTab === 'table' ||
            activeTab === 'list') && (
            <motion.div
              key={`tab-db-${activeTab}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <TaskDatabase
                tasks={project.tasks}
                viewMode={activeTab}
                onViewModeChange={(mode) => onTabChange(mode)}
                onTasksChange={onTasksChange}
                onTaskDocBlocksChange={onTaskDocBlocksChange}
                onCreateTaskDoc={onCreateTaskDoc}
                onCreateMissingTaskDocs={onCreateMissingTaskDocs}
                onLinkExistingTaskDoc={onLinkExistingTaskDoc}
                onLoadTaskDoc={onLoadTaskDoc}
                onPullTaskDoc={onPullTaskDoc}
                onPushTaskDoc={onPushTaskDoc}
                loadingTaskDocIds={loadingTaskDocIds}
                syncingTaskDocIds={syncingTaskDocIds}
                autoSyncEnabled={autoSyncEnabled}
                sheetTitle={project.sheetTitle}
                sheetUrl={project.sheetUrl}
                requestedTaskId={requestedTaskId}
                onClearRequestedTaskId={onClearRequestedTaskId}
                extraDocs={project.extraDocs}
                onCreateSubPage={(parentDocId, parentTitle, title, replaceBlockId) => {
                  const parentTask = project.tasks.find((t) => t.docId === parentDocId);
                  if (!parentTask) return;
                  onCreateSubPage(
                    { kind: 'task', taskId: parentTask.id },
                    parentDocId,
                    parentTitle,
                    title,
                    replaceBlockId
                  );
                }}
                onOpenSubPage={onOpenSubPage}
              />
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="tab-files"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <DriveFilesPanel
                project={project}
                onRefreshFolder={onRefreshDriveFolder}
                onUploadFile={onUploadFile}
                onLinkExistingFile={onLinkExistingFile}
                onRenameFile={onRenameFile}
                onTrashFile={onTrashFile}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
