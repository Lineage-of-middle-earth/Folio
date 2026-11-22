import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { COVER_PRESETS } from '../lib/coverAssets';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, icon: string, coverIndex: number) => Promise<void>;
}

const ICONS = ['📋', '📐', '🗂️', '🧭', '📦', '⚡', '🌿', '🔬'];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a project name.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await onCreate(trimmed, icon, coverIndex);
      setTitle('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="new-project-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onClick={onClose}
        >
          <motion.div
            key="new-project-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
            onClick={(e) => e.stopPropagation()}
          >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100">
            New Workspace Project
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Creates a Drive folder, a Task Database Google Sheet, and a Project Brief Google Doc inside Folio Workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Project Name
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Product Launch"
              className="mt-1.5 w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Page Icon
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ICONS.map((em) => (
                <motion.button
                  key={em}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIcon(em)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-colors ${
                    icon === em
                      ? 'border-neutral-900 bg-neutral-100 dark:border-blue-500 dark:bg-neutral-800'
                      : 'border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918]'
                  }`}
                >
                  {em}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Header Cover
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {COVER_PRESETS.map((preset, idx) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCoverIndex(idx)}
                  className={`overflow-hidden rounded-lg border transition-all ${
                    coverIndex === idx
                      ? 'border-neutral-900 ring-1 ring-neutral-900 dark:border-blue-500 dark:ring-blue-500'
                      : 'border-neutral-200 opacity-75 hover:opacity-100 dark:border-neutral-700'
                  }`}
                >
                  <div
                    className="h-12 w-full"
                    style={{ background: preset.fallbackGradient }}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              {creating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{creating ? 'Provisioning in Drive...' : 'Create Project'}</span>
            </motion.button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
