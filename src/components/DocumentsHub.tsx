import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  FilePlus2,
  FileText,
  Link2,
  ListChecks,
  Maximize2,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  DocBlock,
  ProjectDocPage,
  ProjectWorkspace,
  TaskDocTemplate,
} from '../types/workspace';
import { buildStandaloneDocStarterBlocks } from '../lib/googleWorkspaceApi';
import { BlockEditor } from './BlockEditor';

interface DocumentsHubProps {
  project: ProjectWorkspace;
  autoSyncEnabled: boolean;
  loadingDocIds: Record<string, boolean>;
  syncingDocIds: Record<string, boolean>;
  selectedDocId: string | null;
  onSelectDocId: (docId: string | null) => void;
  openCreatorSignal?: number;
  onCreateNewDoc: (title: string, blocks: DocBlock[]) => void;
  onSelectBrief: () => void;
  onOpenTaskDoc: (taskId: string) => void;
  onLoadDoc: (doc: ProjectDocPage) => Promise<void>;
  onPullDoc: (doc: ProjectDocPage) => Promise<void>;
  onPushDoc: (doc: ProjectDocPage) => void;
  onDocBlocksChange: (docId: string, blocks: DocBlock[]) => void;
  onLinkExistingDoc: () => void;
  onCreateSubPage?: (
    parentDocId: string,
    parentTitle: string,
    title: string,
    replaceBlockId?: string
  ) => void;
  onBackToParent?: (parentDocId: string) => void;
}

const DOC_TEMPLATES: Array<{ id: TaskDocTemplate; label: string; description: string }> = [
  { id: 'spec', label: 'Project Spec', description: 'Overview, goals & checklist' },
  { id: 'meeting', label: 'Meeting Notes', description: 'Agenda, decisions & actions' },
  { id: 'blank', label: 'Blank Document', description: 'Clean heading & body' },
];

export const DocumentsHub: React.FC<DocumentsHubProps> = ({
  project,
  autoSyncEnabled,
  loadingDocIds,
  syncingDocIds,
  selectedDocId,
  onSelectDocId,
  openCreatorSignal = 0,
  onCreateNewDoc,
  onSelectBrief,
  onOpenTaskDoc,
  onLoadDoc,
  onPullDoc,
  onPushDoc,
  onDocBlocksChange,
  onLinkExistingDoc,
  onCreateSubPage,
  onBackToParent,
}) => {
  const [showCreator, setShowCreator] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocTemplate, setNewDocTemplate] = useState<TaskDocTemplate>('spec');

  const activeDoc =
    project.extraDocs.find((d) => d.id === selectedDocId) || null;
  const taskDocs = project.tasks.filter((t) => Boolean(t.docId));

  const resolveParentInfo = (
    parentDocId: string | null | undefined
  ): { id: string; title: string } | null => {
    if (!parentDocId) return null;
    if (project.docId === parentDocId) {
      return {
        id: parentDocId,
        title: project.docTitle || `${project.title} — Brief`,
      };
    }
    const extraParent = project.extraDocs.find((d) => d.id === parentDocId);
    if (extraParent) {
      return { id: extraParent.id, title: extraParent.title };
    }
    const taskParent = project.tasks.find((t) => t.docId === parentDocId);
    if (taskParent) {
      return {
        id: parentDocId,
        title: taskParent.docTitle || taskParent.title || 'Task Document',
      };
    }
    return null;
  };

  const activeParent = activeDoc ? resolveParentInfo(activeDoc.parentDocId) : null;
  const activeChildPages = activeDoc
    ? project.extraDocs.filter((d) => d.parentDocId === activeDoc.id)
    : [];

  useEffect(() => {
    if (openCreatorSignal > 0) {
      setShowCreator(true);
    }
  }, [openCreatorSignal]);

  // Auto-load blocks when opening a standalone doc page
  useEffect(() => {
    if (!activeDoc) return;
    if (activeDoc.blocks !== undefined) return;
    if (loadingDocIds[activeDoc.id]) return;
    onLoadDoc(activeDoc);
  }, [activeDoc, loadingDocIds, onLoadDoc]);

  // Escape key exits whole-screen document view
  useEffect(() => {
    if (!activeDoc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectDocId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc, onSelectDocId]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newDocTitle.trim() || 'Untitled Document';
    const blocks = buildStandaloneDocStarterBlocks(cleanTitle, newDocTemplate);
    onCreateNewDoc(cleanTitle, blocks);
    setNewDocTitle('');
    setShowCreator(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <div>
          <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Documents & Pages
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Create standalone Google Doc pages inside "{project.driveFolderName || project.title}" or open any document full-screen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLinkExistingDoc}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Link Existing Doc</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCreator((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Document Page</span>
          </button>
        </div>
      </div>

      {/* Inline New Document Page Creator */}
      <AnimatePresence initial={false}>
        {showCreator && (
          <motion.form
            key="new-doc-creator"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={handleCreateSubmit}
            className="space-y-4 rounded-xl border border-neutral-200 bg-[#F8F8F7] p-5 dark:border-neutral-800 dark:bg-[#20201E]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FilePlus2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Create New Google Doc Page
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                aria-label="Close document creator"
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
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g. Architecture Notes, Launch Checklist, Weekly Sync..."
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DOC_TEMPLATES.map((tpl) => {
                const selected = newDocTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setNewDocTemplate(tpl.id)}
                    className={`rounded-lg border p-2.5 text-left transition-colors ${
                      selected
                        ? 'border-neutral-900 bg-white shadow-xs dark:border-blue-500 dark:bg-[#191918]'
                        : 'border-neutral-200 bg-white/60 hover:bg-white dark:border-neutral-800 dark:bg-[#191918]/60 dark:hover:bg-[#191918]'
                    }`}
                  >
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {tpl.label}
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      {tpl.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreator(false)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>Create Google Doc Page</span>
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Project Brief + Standalone Document Pages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Project Documents ({(project.docId ? 1 : 0) + project.extraDocs.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Primary Project Brief */}
          {project.docId && (
            <div
              onClick={onSelectBrief}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectBrief();
                }
              }}
              className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:shadow-xs dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-sm font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                      {project.docTitle || `${project.title} — Brief`}
                    </span>
                    {project.dirtyDoc && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Primary Project Brief · {project.blocks.length} blocks
                  </div>
                </div>
              </div>
              {project.docUrl && (
                <a
                  href={project.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Open in Google Docs"
                  aria-label="Open Brief in Google Docs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Standalone Extra Document Pages */}
          {project.extraDocs.map((doc) => {
            const parentInfo = resolveParentInfo(doc.parentDocId);
            const subCount = project.extraDocs.filter(
              (d) => d.parentDocId === doc.id
            ).length;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocId(doc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDocId(doc.id);
                  }
                }}
                className="group flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:shadow-xs dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-sm font-semibold text-neutral-900 group-hover:underline dark:text-neutral-100">
                        {doc.title}
                      </span>
                      {doc.dirty && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                          title="Unsynced edits"
                        />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{parentInfo ? 'Sub-page' : 'Google Doc Page'}</span>
                      {parentInfo && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="max-w-[180px] truncate text-blue-600 dark:text-blue-400">
                            Inside: {parentInfo.title}
                          </span>
                        </>
                      )}
                      {subCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{subCount} sub-page{subCount > 1 ? 's' : ''}</span>
                        </>
                      )}
                      {doc.blocks && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{doc.blocks.length} blocks</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="rounded p-1 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    title="Open in Google Docs"
                    aria-label={`Open ${doc.title} in Google Docs`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {project.extraDocs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-8 text-center dark:border-neutral-800 dark:bg-[#20201E]">
            <FilePlus2 className="h-7 w-7 text-neutral-400" />
            <p className="mt-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              No standalone document pages yet
            </p>
            <p className="mt-0.5 max-w-md text-xs text-neutral-500 dark:text-neutral-400">
              Click "New Document Page" above to create specs, meeting notes, or reference docs synced directly to Google Docs.
            </p>
          </div>
        )}
      </div>

      {/* Linked Task Google Docs */}
      <div className="space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Task Document Pages ({taskDocs.length})
          </h3>
        </div>

        {taskDocs.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            No task documents linked yet. Open any task from the Board, Table, or List to create its Google Doc page.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#20201E]">
            {taskDocs.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenTaskDoc(task.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenTaskDoc(task.id);
                  }
                }}
                className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ListChecks className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {task.docTitle || task.title}
                    </div>
                    <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      Task: {task.title} · {task.status}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Open Whole Screen
                  </span>
                  {task.docUrl && (
                    <a
                      href={task.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      title="Open in Google Docs"
                      aria-label={`Open ${task.docTitle || task.title} in Google Docs`}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Whole-Screen Standalone Document Editor Overlay */}
      <AnimatePresence>
        {activeDoc && (
          <motion.div
            key="extra-doc-fullscreen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-[#191918]"
          >
            <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 dark:border-neutral-800 sm:px-6">
              <div className="flex min-w-0 items-center gap-2.5">
                {activeParent && onBackToParent ? (
                  <button
                    type="button"
                    onClick={() => onBackToParent(activeParent.id)}
                    className="inline-flex max-w-[240px] items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 shrink-0"
                    title={`Back to ${activeParent.title}`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Back to {activeParent.title}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectDocId(null)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Documents</span>
                  </button>
                )}
                <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
                  /
                </span>
                <span className="flex items-center gap-1.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                    {activeDoc.title}
                  </span>
                </span>
                {syncingDocIds[activeDoc.id] ? (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Syncing...</span>
                  </span>
                ) : activeDoc.dirty ? (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
                    {autoSyncEnabled ? 'Auto-sync pending' : 'Unsynced edits'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Synced with Google Docs</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={activeDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                >
                  <span>Open in Google Docs</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => onPullDoc(activeDoc)}
                  disabled={Boolean(loadingDocIds[activeDoc.id])}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                  title="Pull latest content from Google Docs"
                >
                  <ArrowDownToLine className="h-3 w-3" />
                  <span>Pull</span>
                </button>
                {!autoSyncEnabled && activeDoc.dirty && (
                  <button
                    type="button"
                    onClick={() => onPushDoc(activeDoc)}
                    disabled={Boolean(syncingDocIds[activeDoc.id])}
                    className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                  >
                    <ArrowUpFromLine className="h-3 w-3" />
                    <span>Save to Doc</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectDocId(null)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Close (Esc)"
                  aria-label="Close whole-screen document"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8 sm:px-10">
                <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
                    {activeDoc.title}
                  </h1>
                  <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    Standalone Google Doc · Use the formatting bar or type <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono dark:bg-neutral-800">/</code> for headings, checklists, callouts, and code blocks.
                  </p>
                </div>

                {loadingDocIds[activeDoc.id] || activeDoc.blocks === undefined ? (
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
                        activeDoc.blocks.length > 0
                          ? activeDoc.blocks
                          : buildStandaloneDocStarterBlocks(activeDoc.title, 'blank')
                      }
                      onChange={(nextBlocks) => onDocBlocksChange(activeDoc.id, nextBlocks)}
                      onCreateSubPage={
                        onCreateSubPage
                          ? (title, replaceBlockId) =>
                              onCreateSubPage(
                                activeDoc.id,
                                activeDoc.title,
                                title,
                                replaceBlockId
                              )
                          : undefined
                      }
                      onOpenPageDoc={(docId) => onSelectDocId(docId)}
                    />

                    {activeChildPages.length > 0 && (
                      <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                          Sub-Pages inside "{activeDoc.title}" ({activeChildPages.length})
                        </h3>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {activeChildPages.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => onSelectDocId(sub.id)}
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
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
