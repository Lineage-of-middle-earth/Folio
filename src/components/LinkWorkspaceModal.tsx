import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { DriveFileItem } from '../types/workspace';
import { searchDriveFiles } from '../lib/googleWorkspaceApi';

interface LinkWorkspaceModalProps {
  isOpen: boolean;
  mode: 'import-project' | 'link-to-project' | 'link-to-task' | 'link-extra-doc';
  taskTitle?: string;
  token: string | null;
  isGuestMode?: boolean;
  localFiles?: DriveFileItem[];
  onClose: () => void;
  onSelectFile: (file: DriveFileItem) => Promise<void>;
}

export const LinkWorkspaceModal: React.FC<LinkWorkspaceModalProps> = ({
  isOpen,
  mode,
  taskTitle,
  token,
  isGuestMode = false,
  localFiles = [],
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'folder' | 'sheet' | 'doc'>(
    mode === 'import-project'
      ? 'all'
      : mode === 'link-to-task' || mode === 'link-extra-doc'
      ? 'doc'
      : 'sheet'
  );
  const [results, setResults] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFilter(
        mode === 'import-project'
          ? 'all'
          : mode === 'link-to-task' || mode === 'link-extra-doc'
          ? 'doc'
          : 'sheet'
      );
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    if (isGuestMode) {
      const q = query.trim().toLowerCase();
      const filtered = localFiles.filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (filter === 'folder') {
          return f.mimeType === 'application/vnd.google-apps.folder';
        }
        if (filter === 'sheet') {
          return f.mimeType === 'application/vnd.google-apps.spreadsheet';
        }
        if (filter === 'doc') {
          return f.mimeType === 'application/vnd.google-apps.document';
        }
        return true;
      });
      setResults(filtered);
      return;
    }
    if (!token) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const files = await searchDriveFiles(token, query, filter);
        if (active) setResults(files);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Could not search Drive.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    const timer = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, token, isGuestMode, localFiles, query, filter]);

  const handlePick = async (file: DriveFileItem) => {
    setSelectingId(file.id);
    setError(null);
    try {
      await onSelectFile(file);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect file.');
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="link-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            key="link-modal-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div>
            <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {mode === 'import-project'
                ? 'Import from Google Drive'
                : mode === 'link-to-task'
                ? `Link Google Doc to "${taskTitle || 'Task'}"`
                : mode === 'link-extra-doc'
                ? 'Add Existing Google Doc Page'
                : 'Link Google Sheet or Doc to Project'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {mode === 'import-project'
                ? 'Pick an existing folder, Google Sheet, or Google Doc to open as a Folio project.'
                : mode === 'link-to-task'
                ? 'Select an existing Google Doc from your Drive to connect to this task.'
                : mode === 'link-extra-doc'
                ? 'Select any Google Doc from Drive to add it as a document page in this project.'
                : 'Select an existing Google Sheet (tasks) or Google Doc (brief) to bind to this project.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your Google Drive by name..."
              className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800/80">
            {(
              [
                { id: 'all', label: 'All Files' },
                { id: 'folder', label: 'Folders' },
                { id: 'sheet', label: 'Sheets' },
                { id: 'doc', label: 'Docs' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`relative flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                }`}
              >
                {filter === tab.id && (
                  <motion.span
                    layoutId="link-modal-filter"
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 rounded-md bg-white shadow-xs dark:bg-[#191918]"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {error && (
            <p className="mx-2 my-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-xs text-neutral-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Searching Google Drive...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              No matching files found in your Google Drive.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {results.map((file) => {
                const isFolder =
                  file.mimeType === 'application/vnd.google-apps.folder';
                const isSheet =
                  file.mimeType === 'application/vnd.google-apps.spreadsheet';
                const isDoc =
                  file.mimeType === 'application/vnd.google-apps.document';
                const canLink =
                  mode === 'import-project'
                    ? isFolder || isSheet || isDoc
                    : mode === 'link-to-task' || mode === 'link-extra-doc'
                    ? isDoc
                    : isSheet || isDoc;

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 px-2.5 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {isFolder ? (
                        <Folder className="h-4 w-4 shrink-0 text-amber-600" />
                      ) : isSheet ? (
                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : isDoc ? (
                        <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                      ) : (
                        <File className="h-4 w-4 shrink-0 text-neutral-400" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {isFolder
                            ? 'Google Drive Folder'
                            : isSheet
                            ? 'Google Sheet'
                            : isDoc
                            ? 'Google Doc'
                            : 'Drive File'}
                          {file.modifiedTime && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span className="font-mono tabular-nums">
                                {file.modifiedTime.slice(0, 10)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canLink || selectingId === file.id}
                      onClick={() => handlePick(file)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                    >
                      {selectingId === file.id
                        ? 'Connecting...'
                        : mode === 'import-project'
                        ? 'Import'
                        : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
