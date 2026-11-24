import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  Link2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import { DocBlock, DriveFileItem, ProjectWorkspace } from '../types/workspace';
import { DriveGuidelinePanel } from './DriveGuidelinePanel';

interface DriveFilesPanelProps {
  project: ProjectWorkspace;
  onRefreshFolder: () => void;
  onUploadFile: (file: File) => void;
  onLinkExistingFile: () => void;
  onRenameFile: (file: DriveFileItem, newName: string) => void;
  onTrashFile: (file: DriveFileItem) => void;
  onCreateProjectDoc?: (title: string, blocks: DocBlock[]) => void;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (mimeType === 'application/vnd.google-apps.document') {
    return <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  }
  if (mimeType === 'application/vnd.google-apps.folder') {
    return <Folder className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
  return <File className="h-4 w-4 text-neutral-500" />;
}

function getMimeLabel(mimeType: string): string {
  if (mimeType === 'application/vnd.google-apps.spreadsheet') return 'Google Sheet';
  if (mimeType === 'application/vnd.google-apps.document') return 'Google Doc';
  if (mimeType === 'application/vnd.google-apps.folder') return 'Folder';
  if (mimeType === 'application/vnd.google-apps.presentation') return 'Google Slides';
  if (mimeType === 'application/pdf') return 'PDF';
  return 'Drive File';
}

function formatBytes(size?: string): string {
  if (!size) return '—';
  const num = Number(size);
  if (Number.isNaN(num) || num <= 0) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export const DriveFilesPanel: React.FC<DriveFilesPanelProps> = ({
  project,
  onRefreshFolder,
  onUploadFile,
  onLinkExistingFile,
  onRenameFile,
  onTrashFile,
  onCreateProjectDoc,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const startRename = (file: DriveFileItem) => {
    setRenamingId(file.id);
    setRenameDraft(file.name);
  };

  const commitRename = (file: DriveFileItem) => {
    const trimmed = renameDraft.trim();
    setRenamingId(null);
    if (trimmed && trimmed !== file.name) {
      onRenameFile(file, trimmed);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div>
          <h3 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Connected Google Drive Folder
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {project.driveFolderName || project.title} ·{' '}
            <span className="tabular-nums">{project.driveFiles.length}</span> file(s)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefreshFolder}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onLinkExistingFile}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>Link Sheet / Doc</span>
          </button>

          {project.driveFolderId && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    onUploadFile(f);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload to Drive</span>
              </button>
            </>
          )}

          {project.driveFolderUrl && (
            <a
              href={project.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <span>Open Folder</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <DriveGuidelinePanel
        projects={[project]}
        defaultProjectId={project.id}
        compact
        onCreateOrganizedDocument={
          onCreateProjectDoc
            ? (opts) => onCreateProjectDoc(opts.title, opts.blocks)
            : undefined
        }
      />

      {project.driveFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-12 text-center dark:border-neutral-800 dark:bg-[#20201E]">
          <Folder className="h-8 w-8 text-neutral-400" />
          <p className="mt-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            This Drive folder has no additional files
          </p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Upload specs, PDFs, or images directly into Google Drive.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#191918]">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-[#F8F8F7] text-neutral-500 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-400">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="w-32 px-4 py-2.5 font-medium">Type</th>
                <th className="w-24 px-4 py-2.5 font-medium text-right">Size</th>
                <th className="w-36 px-4 py-2.5 font-medium">Modified</th>
                <th className="w-28 px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              <AnimatePresence initial={false}>
              {project.driveFiles.map((file) => {
                const isLinkedPrimary =
                  file.id === project.sheetId || file.id === project.docId;
                return (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="h-10 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        {getFileIcon(file.mimeType)}
                        {renamingId === file.id ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitRename(file)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(file);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="w-full rounded border border-blue-500 bg-transparent px-1.5 py-0.5 text-xs outline-none"
                          />
                        ) : (
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {file.name}
                            {isLinkedPrimary && (
                              <span className="ml-2 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                                · Synced source
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                      {getMimeLabel(file.mimeType)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                      {file.modifiedTime ? file.modifiedTime.slice(0, 10) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                            title="Open in Google Workspace"
                            aria-label={`Open ${file.name} in Google Workspace`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => startRename(file)}
                          className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                          title="Rename in Drive"
                          aria-label={`Rename ${file.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onTrashFile(file)}
                          className="rounded p-1 text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                          title="Move to Trash in Drive"
                          aria-label={`Move ${file.name} to Trash`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
