import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  EyeOff,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { DocBlock, StandalonePage } from '../types/workspace';
import { COVER_PRESETS } from '../lib/coverAssets';
import { BlockEditor } from './BlockEditor';

interface StandalonePageViewProps {
  page: StandalonePage;
  allPages: StandalonePage[];
  isPulling: boolean;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  fullWidth?: boolean;
  onTitleChange: (title: string) => void;
  onIconChange: (icon: string) => void;
  onCoverChange: (coverUrl: string | null) => void;
  onBlocksChange: (blocks: DocBlock[]) => void;
  onPullPage: () => void;
  onPushPage: () => void;
  onCreateSubPage: (title: string, replaceBlockId?: string) => void;
  onOpenPage: (pageId: string) => void;
  onRemoveFromWorkspace: () => void;
  onDeletePermanently: () => void;
}

const PAGE_ICONS = ['📄', '📝', '📌', '💡', '📑', '🧭', '⚡', '🌿'];

export const StandalonePageView: React.FC<StandalonePageViewProps> = ({
  page,
  allPages,
  isPulling,
  isSyncing,
  autoSyncEnabled,
  fullWidth = false,
  onTitleChange,
  onIconChange,
  onCoverChange,
  onBlocksChange,
  onPullPage,
  onPushPage,
  onCreateSubPage,
  onOpenPage,
  onRemoveFromWorkspace,
  onDeletePermanently,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const parentPage = page.parentDocId
    ? allPages.find((p) => p.id === page.parentDocId)
    : null;
  const subPages = allPages.filter((p) => p.parentDocId === page.id);

  const containerClass = fullWidth
    ? 'w-full max-w-none px-4 sm:px-6 transition-all duration-200'
    : 'mx-auto max-w-[960px] px-6 lg:px-10 transition-all duration-200';

  return (
    <div className="min-h-full pb-20">
      {/* Cover Header */}
      <AnimatePresence initial={false}>
        {page.coverUrl ? (
          <motion.div
            key="page-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="group relative h-44 w-full overflow-hidden border-b border-neutral-200 dark:border-neutral-800 sm:h-52"
            style={{ background: COVER_PRESETS[0].fallbackGradient }}
          >
            <img
              src={page.coverUrl}
              alt={`${page.title} cover`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-3 right-6 flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setShowCoverPicker((prev) => !prev)}
                className="rounded-md border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
              >
                Change cover
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCoverPicker(false);
                  onCoverChange(null);
                }}
                className="rounded-md border border-neutral-200/80 bg-white/90 px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-xs backdrop-blur-xs hover:bg-white dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200"
              >
                Hide
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="add-cover-row"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`${containerClass} pt-6`}
          >
            <button
              type="button"
              onClick={() => onCoverChange(COVER_PRESETS[0].url)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Add cover</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCoverPicker && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className={`${containerClass} pt-3`}
          >
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-neutral-800 dark:bg-[#20201E]">
              {COVER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
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
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Page Container */}
      <div className={containerClass}>
        {parentPage && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => onOpenPage(parentPage.id)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>
                Back to {parentPage.icon} {parentPage.title}
              </span>
            </button>
          </div>
        )}

        {/* Icon + Title */}
        <div className={page.coverUrl ? '-mt-7 relative z-10' : 'pt-4'}>
          <div className="relative inline-block">
            <button
              type="button"
              onClick={() => setShowIconPicker((prev) => !prev)}
              className="flex h-14 w-14 items-center justify-center rounded-xl border border-neutral-200 bg-white text-3xl shadow-xs dark:border-neutral-800 dark:bg-[#20201E]"
              title="Change page icon"
            >
              {page.icon}
            </button>
            <AnimatePresence>
              {showIconPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  className="absolute left-0 top-full z-20 mt-2 flex gap-1 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-[#242422]"
                >
                  {PAGE_ICONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        onIconChange(em);
                        setShowIconPicker(false);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-base hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      {em}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            type="text"
            value={page.title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-label="Standalone page title"
            placeholder="Untitled Page"
            className="mt-3 w-full bg-transparent font-display text-3xl font-semibold tracking-tight text-neutral-900 outline-none dark:text-neutral-50 sm:text-4xl"
          />
        </div>

        {/* Google Doc Sync Bar & Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-neutral-200/80 py-2.5 text-xs dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={page.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-neutral-800 hover:underline dark:text-neutral-200"
            >
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              <span>Standalone Google Doc</span>
              <ExternalLink className="h-3 w-3 text-neutral-400" />
            </a>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">
              ·
            </span>
            {isSyncing ? (
              <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Syncing to Google Docs...</span>
              </span>
            ) : page.dirty ? (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {autoSyncEnabled ? 'Auto-sync scheduled' : 'Unsynced local edits'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Synced with Google Docs</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onCreateSubPage('Untitled Sub-Page')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>New Sub-Page</span>
            </button>

            <button
              type="button"
              onClick={onPullPage}
              disabled={isPulling || isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              {isPulling ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              )}
              <span>Pull</span>
            </button>

            <button
              type="button"
              onClick={onPushPage}
              disabled={!page.dirty || isSyncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-35 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" />
              <span>Save to Google Doc</span>
            </button>

            {/* 3-Dot Options Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu((v) => !v)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="Page options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onRemoveFromWorkspace();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                      <span>Remove from Here (Keep in Drive)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onDeletePermanently();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Permanently from Drive</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Block Editor */}
        <div className="mt-7 space-y-8">
          <BlockEditor
            blocks={page.blocks}
            onChange={onBlocksChange}
            onCreateSubPage={(title, replaceBlockId) =>
              onCreateSubPage(title, replaceBlockId)
            }
            onOpenPageDoc={(docId) => onOpenPage(docId)}
          />

          {subPages.length > 0 && (
            <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Sub-Pages inside "{page.title}" ({subPages.length})
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {subPages.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onOpenPage(sub.id)}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-[#F8F8F7] px-3.5 py-2.5 text-left transition-colors hover:border-neutral-300 hover:bg-white dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span>{sub.icon}</span>
                      <span className="truncate text-sm font-medium text-neutral-900 group-hover:underline dark:text-neutral-100">
                        {sub.title}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                      Open →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
