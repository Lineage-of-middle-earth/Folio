import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Folder,
  RefreshCw,
} from 'lucide-react';
import { ProjectWorkspace, SyncActivityEntry } from '../types/workspace';

interface SyncHubViewProps {
  projects: ProjectWorkspace[];
  activityLog: SyncActivityEntry[];
  autoSyncEnabled: boolean;
  syncingIds: Record<string, boolean>;
  onToggleAutoSync: () => void;
  onPullAll: () => void;
  onPullProject: (project: ProjectWorkspace) => void;
  onPushProject: (project: ProjectWorkspace) => void;
  onOpenProject: (projectId: string) => void;
  isPullingId: string | null;
}

export const SyncHubView: React.FC<SyncHubViewProps> = ({
  projects,
  activityLog,
  autoSyncEnabled,
  syncingIds,
  onToggleAutoSync,
  onPullAll,
  onPullProject,
  onPushProject,
  onOpenProject,
  isPullingId,
}) => {
  return (
    <div className="mx-auto max-w-[1100px] space-y-8 px-6 py-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Sync
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onPullAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onToggleAutoSync}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              autoSyncEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60'
                : 'border-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800 dark:border-neutral-700 dark:bg-blue-600 dark:hover:bg-blue-500'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{autoSyncEnabled ? 'Auto-Sync: On' : 'Auto-Sync: Off'}</span>
          </motion.button>
        </div>
      </div>

      {/* Connected Projects Sync Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#191918]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-[#F8F8F7] text-neutral-500 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Drive</th>
              <th className="px-4 py-3 font-medium">Sheet</th>
              <th className="px-4 py-3 font-medium">Doc</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  No projects yet.
                </td>
              </tr>
            ) : (
              projects.map((p) => {
                const dirtyTaskDocsCount = p.tasks.filter((t) => t.dirtyTaskDoc).length;
                const dirtyExtraDocsCount = p.extraDocs.filter((d) => d.dirty).length;
                const hasDirty =
                  p.dirtyDoc ||
                  p.dirtyTasks ||
                  dirtyTaskDocsCount > 0 ||
                  dirtyExtraDocsCount > 0;
                const isPulling = isPullingId === p.id;
                return (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenProject(p.id)}
                        className="flex items-center gap-2 font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                      >
                        <span>{p.icon}</span>
                        <span>{p.title}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {p.driveFolderUrl ? (
                        <a
                          href={p.driveFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-neutral-950 hover:underline dark:text-neutral-300 dark:hover:text-white"
                        >
                          <Folder className="h-3.5 w-3.5 text-amber-600" />
                          <span className="truncate max-w-[130px]">
                            {p.driveFolderName || 'Folder'}
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.sheetUrl ? (
                        <a
                          href={p.sheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-neutral-950 hover:underline dark:text-neutral-300 dark:hover:text-white"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="tabular-nums">
                            {p.tasks.length} rows
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.docUrl ? (
                        <a
                          href={p.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-neutral-700 hover:text-neutral-950 hover:underline dark:text-neutral-300 dark:hover:text-white"
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-600" />
                          <span className="tabular-nums">
                            {p.blocks.length} blocks
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-neutral-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {syncingIds[p.id] ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      ) : hasDirty ? (
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {autoSyncEnabled ? 'Auto-sync pending · ' : ''}
                          {[
                            p.dirtyTasks && 'Tasks edited',
                            p.dirtyDoc && 'Doc edited',
                            dirtyTaskDocsCount > 0 &&
                              `${dirtyTaskDocsCount} task doc${dirtyTaskDocsCount > 1 ? 's' : ''} edited`,
                            dirtyExtraDocsCount > 0 &&
                              `${dirtyExtraDocsCount} doc page${dirtyExtraDocsCount > 1 ? 's' : ''} edited`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>In sync</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onPullProject(p)}
                          disabled={isPulling || Boolean(syncingIds[p.id])}
                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
                        >
                          {isPulling ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowDownToLine className="h-3 w-3" />
                          )}
                          <span>Pull</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPushProject(p)}
                          disabled={!hasDirty || Boolean(syncingIds[p.id])}
                          className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-35 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                        >
                          <ArrowUpFromLine className="h-3 w-3" />
                          <span>Push</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Real Session Sync History */}
      <div>
        <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          Recent Activity
        </h2>
        {activityLog.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">
            No sync activity yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#191918]">
            <AnimatePresence initial={false}>
            {activityLog.slice(0, 12).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2 text-neutral-800 dark:text-neutral-200">
                  <span className="font-medium">{entry.projectTitle}</span>
                  <span aria-hidden="true" className="text-neutral-400">
                    ·
                  </span>
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {entry.target}
                  </span>
                  <span aria-hidden="true" className="text-neutral-400">
                    —
                  </span>
                  <span>{entry.action}</span>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
