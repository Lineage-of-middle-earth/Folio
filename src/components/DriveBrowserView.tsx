import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { DriveFileItem } from '../types/workspace';
import { searchDriveFiles } from '../lib/googleWorkspaceApi';

interface DriveBrowserViewProps {
  token: string | null;
  isGuestMode?: boolean;
  localFiles?: DriveFileItem[];
  rootFolderUrl: string | null;
  onImportAsProject: (file: DriveFileItem) => Promise<void>;
  onExportLocalBackup?: () => void;
}

export const DriveBrowserView: React.FC<DriveBrowserViewProps> = ({
  token,
  isGuestMode = false,
  localFiles = [],
  rootFolderUrl,
  onImportAsProject,
  onExportLocalBackup,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'folder' | 'sheet' | 'doc'>('all');
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
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
      setFiles(filtered);
      return;
    }
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await searchDriveFiles(token, query, filter);
      setFiles(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to read Google Drive.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles();
    }, isGuestMode ? 50 : 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isGuestMode, localFiles, query, filter]);

  const handleImport = async (file: DriveFileItem) => {
    setImportingId(file.id);
    setError(null);
    try {
      await onImportAsProject(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isGuestMode ? 'Guest Mode · Local Browser Storage' : 'Google Drive Explorer'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            {isGuestMode ? 'Local Workspace Files' : 'Browse & Import Drive Files'}
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {isGuestMode
              ? 'All documents, spreadsheets, and uploaded assets saved locally in your browser during Guest Mode.'
              : 'Search across your Google Drive and bring existing folders, Sheets, or Docs directly into Folio.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadFiles}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {isGuestMode && onExportLocalBackup && (
            <button
              type="button"
              onClick={onExportLocalBackup}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              <span>Download Local Backup (.json)</span>
            </button>
          )}
          {!isGuestMode && rootFolderUrl && (
            <a
              href={rootFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
            >
              <span>Open Folio Folder</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Google Drive..."
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-100"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800/80">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'folder', label: 'Folders' },
              { id: 'sheet', label: 'Sheets' },
              { id: 'doc', label: 'Docs' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`relative rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'text-neutral-900 dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
              }`}
            >
              {filter === tab.id && (
                <motion.span
                  layoutId="drive-browser-filter"
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 rounded-md bg-white shadow-xs dark:bg-[#191918]"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#191918]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-[#F8F8F7] text-neutral-500 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-400">
              <th className="px-4 py-2.5 font-medium">File Name</th>
              <th className="w-36 px-4 py-2.5 font-medium">Workspace App</th>
              <th className="w-32 px-4 py-2.5 font-medium">Modified</th>
              <th className="w-40 px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {loading && files.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="h-10">
                  <td colSpan={4} className="px-4 py-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  </td>
                </tr>
              ))
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-neutral-500">
                  No Google Drive files match this search.
                </td>
              </tr>
            ) : (
              files.map((file) => {
                const isFolder =
                  file.mimeType === 'application/vnd.google-apps.folder';
                const isSheet =
                  file.mimeType === 'application/vnd.google-apps.spreadsheet';
                const isDoc =
                  file.mimeType === 'application/vnd.google-apps.document';
                const canImport = isFolder || isSheet || isDoc;

                return (
                  <tr
                    key={file.id}
                    className="h-10 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        {isFolder ? (
                          <Folder className="h-4 w-4 shrink-0 text-amber-600" />
                        ) : isSheet ? (
                          <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : isDoc ? (
                          <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                        ) : (
                          <File className="h-4 w-4 shrink-0 text-neutral-400" />
                        )}
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                      {isFolder
                        ? 'Google Drive'
                        : isSheet
                        ? 'Google Sheets'
                        : isDoc
                        ? 'Google Docs'
                        : 'Drive File'}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                      {file.modifiedTime ? file.modifiedTime.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canImport && (
                          <button
                            type="button"
                            disabled={importingId === file.id}
                            onClick={() => handleImport(file)}
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                          >
                            <FolderPlus className="h-3 w-3" />
                            <span>
                              {importingId === file.id ? 'Opening...' : 'Open in Folio'}
                            </span>
                          </button>
                        )}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            title="Open in Google Workspace"
                            aria-label={`Open ${file.name}`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
