import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { PendingConfirmation } from '../types/workspace';

interface ConfirmModalProps {
  confirmation: PendingConfirmation | null;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  confirmation,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!confirmation) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmation.onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workspace operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {confirmation && (
        <motion.div
          key="confirm-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={() => !isSubmitting && onClose()}
        >
          <motion.div
            key="confirm-modal-panel"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-[#20201E]"
          >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                confirmation.danger
                  ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400'
                  : 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400'
              }`}
            >
              {confirmation.danger ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </div>
            <div>
              <h3
                id="confirm-modal-title"
                className="font-display text-base font-semibold text-neutral-900 dark:text-neutral-100"
              >
                {confirmation.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {confirmation.description}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            aria-label="Close confirmation dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {confirmation.details.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3.5 py-3 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-[#191918] dark:text-neutral-300">
            {confirmation.details.map((detail, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                <span className="leading-relaxed">{detail}</span>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 whitespace-nowrap shrink-0"
          >
            Cancel
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 ${
              confirmation.danger
                ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                : 'bg-neutral-900 hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500'
            }`}
          >
            {isSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? 'Syncing...' : confirmation.confirmLabel}
          </motion.button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
