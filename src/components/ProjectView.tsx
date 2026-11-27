import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  EyeOff,
  FilePlus2,
  Files,
  FileSpreadsheet,
  FileText,
  FolderInput,
  FolderMinus,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  ListChecks,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  DocBlock,
  DriveFileItem,
  ProjectDocPage,
  ProjectFolderGroup,
  ProjectTabView,
  ProjectWorkspace,
  TaskItem,
} from '../types/workspace';
import { COVER_PRESETS } from '../lib/coverAssets';
import { BlockEditor } from './BlockEditor';
import { CoverPickerModal } from './CoverPickerModal';
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
  folderGroups?: ProjectFolderGroup[];
  onAssignProjectToGroup?: (groupId: string | null) => void;
  onRemoveProjectFromWorkspace?: () => void;
  onDeleteProjectPermanently?: () => void;
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
  folderGroups = [],
  onAssignProjectToGroup,
  onRemoveProjectFromWorkspace,
  onDeleteProjectPermanently,
  fullWidth = false,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [openCreatorSignal, setOpenCreatorSignal] = useState(0);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [lastTaskViewMode, setLastTaskViewMode] = useState<'board' | 'table' | 'list'>('board');
  const [inlineTaskViewMode, setInlineTaskViewMode] = useState<'board' | 'table' | 'list'>('board');

  const isTasksTab =
    activeTab === 'board' || activeTab === 'table' || activeTab === 'list';

  const activeTopTab: 'page' | 'docs' | 'tasks' | 'files' = isTasksTab
    ? 'tasks'
    : activeTab;

  const hasPendingChanges =
    project.dirtyDoc ||
    project.dirtyTasks ||
    project.tasks.some((t) => Boolean(t.dirtyTaskDoc)) ||
    project.extraDocs.some((d) => Boolean(d.dirty));
  const doneCount = project.tasks.filter((t) => t.status === 'Done').length;

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
          <div className="absolute bottom-3 right-6 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCoverPicker(true)}
              className="rounded-md border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-200"
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
              className="rounded-md border border-neutral-200/80 bg-white/95 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-200"
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
            onClick={() => setShowCoverPicker(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Add cover</span>
          </motion.button>
        </motion.div>
      )}
      </AnimatePresence>

      <CoverPickerModal
        isOpen={showCoverPicker}
        currentCoverUrl={project.coverUrl}
        onSelectCover={(url) => onCoverChange(url)}
        onClose={() => setShowCoverPicker(false)}
      />

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

        {/* Compact Single-Line Workspace Metadata Strip (Zero-Pill Discipline) */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          {project.driveFolderUrl && (
            <>
              <a
                href={project.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
              >
                <FolderOpen className="h-3.5 w-3.5 text-amber-600/90" />
                <span>Drive</span>
              </a>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            </>
          )}
          {project.sheetUrl && (
            <>
              <a
                href={project.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600/90" />
                <span>Sheet</span>
              </a>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            </>
          )}
          {project.docUrl && (
            <>
              <a
                href={project.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
              >
                <FileText className="h-3.5 w-3.5 text-blue-600/90" />
                <span>Doc</span>
              </a>
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            </>
          )}
          <span className="tabular-nums">
            {doneCount}/{project.tasks.length} tasks
          </span>
          <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
          {isSyncing ? (
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing</span>
            </span>
          ) : hasPendingChanges ? (
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {autoSyncEnabled ? 'Auto-syncing' : 'Unsynced'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Synced</span>
            </span>
          )}
        </div>

        {/* View Switcher & Minimal Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-neutral-100/90 p-1 dark:bg-neutral-800/80">
            {(
              [
                { id: 'page', label: 'Brief', icon: <FileText className="h-3.5 w-3.5" /> },
                { id: 'docs', label: 'Docs', icon: <Files className="h-3.5 w-3.5" /> },
                { id: 'tasks', label: 'Tasks', icon: <ListChecks className="h-3.5 w-3.5" /> },
                { id: 'files', label: 'Files', icon: <FolderOpen className="h-3.5 w-3.5" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'tasks') {
                    onTabChange(lastTaskViewMode);
                  } else {
                    onTabChange(tab.id);
                  }
                }}
                className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTopTab === tab.id
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                }`}
              >
                {activeTopTab === tab.id && (
                  <motion.span
                    layoutId={`project-tab-pill-${project.id}`}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-md bg-white shadow-2xs dark:bg-[#191918]"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                onTabChange('docs');
                setOpenCreatorSignal((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
              title="New document page"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>New Doc</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onPullFromWorkspace}
              disabled={isPulling || isSyncing}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Pull latest from Google Workspace"
              aria-label="Pull latest"
            >
              {isPulling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
            </motion.button>

            {!autoSyncEnabled && hasPendingChanges && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onPushToWorkspace}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5" />
                <span>Sync</span>
              </motion.button>
            )}

            {/* 3-Dot Project Options Menu (includes Auto-Sync & Link File) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProjectMenu((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="More options"
                aria-label="Project options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {showProjectMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectMenu(false);
                        onToggleAutoSync();
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${
                            autoSyncEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'
                          }`}
                        />
                        <span>Auto-Sync</span>
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          autoSyncEnabled
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-neutral-400'
                        }`}
                      >
                        {autoSyncEnabled ? 'On' : 'Off'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectMenu(false);
                        onLinkExistingFile();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <Link2 className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Link Sheet / Doc</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProjectMenu(false);
                        onTabChange('docs');
                        setOpenCreatorSignal((n) => n + 1);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Add Page</span>
                    </button>

                    {folderGroups.length > 0 && onAssignProjectToGroup && (
                      <>
                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                        <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                          Folder
                        </div>
                        {project.groupId && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowProjectMenu(false);
                              onAssignProjectToGroup(null);
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
                                setShowProjectMenu(false);
                                onAssignProjectToGroup(g.id);
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

                    {(onRemoveProjectFromWorkspace || onDeleteProjectPermanently) && (
                      <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                    )}

                    {onRemoveProjectFromWorkspace && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProjectMenu(false);
                          onRemoveProjectFromWorkspace();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                        <span>Remove from Folio</span>
                      </button>
                    )}

                    {onDeleteProjectPermanently && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowProjectMenu(false);
                          onDeleteProjectPermanently();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Permanently</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Active View Content */}
        <div className="mt-5">
          <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'page' && (
            <motion.div
              key="tab-page"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
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
                    <div className="border-t border-neutral-200 pt-5 dark:border-neutral-800">
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
              <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    Tasks
                  </h2>
                </div>
                <TaskDatabase
                  tasks={project.tasks}
                  viewMode={inlineTaskViewMode}
                  onViewModeChange={(mode) => setInlineTaskViewMode(mode)}
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
              key="tab-db"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <TaskDatabase
                tasks={project.tasks}
                viewMode={activeTab}
                onViewModeChange={(mode) => {
                  setLastTaskViewMode(mode);
                  onTabChange(mode);
                }}
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
                onCreateProjectDoc={onCreateStandaloneDoc}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
