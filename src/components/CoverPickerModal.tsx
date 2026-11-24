import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Image as ImageIcon, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import {
  COVER_PRESETS,
  UploadedCoverItem,
  compressCoverImageToDataUrl,
  loadUploadedCovers,
  saveUploadedCovers,
} from '../lib/coverAssets';

interface CoverPickerModalProps {
  isOpen: boolean;
  currentCoverUrl: string | null;
  onSelectCover: (coverUrl: string | null) => void;
  onClose: () => void;
}

export const CoverPickerModal: React.FC<CoverPickerModalProps> = ({
  isOpen,
  currentCoverUrl,
  onSelectCover,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'official' | 'uploaded'>('official');
  const [uploadedCovers, setUploadedCovers] = useState<UploadedCoverItem[]>(() =>
    loadUploadedCovers()
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUploadedCovers(loadUploadedCovers());
      setUploadError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const dataUrl = await compressCoverImageToDataUrl(file);
      const newCover: UploadedCoverItem = {
        id: `cov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name.replace(/\.[^.]+$/, '') || 'Custom Cover',
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      const next = [newCover, ...uploadedCovers].slice(0, 16);
      setUploadedCovers(next);
      saveUploadedCovers(next);
      onSelectCover(newCover.url);
      setActiveTab('uploaded');
      onClose();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to process uploaded image.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUploaded = (coverId: string) => {
    const target = uploadedCovers.find((c) => c.id === coverId);
    const next = uploadedCovers.filter((c) => c.id !== coverId);
    setUploadedCovers(next);
    saveUploadedCovers(next);
    if (target && currentCoverUrl === target.url) {
      onSelectCover(COVER_PRESETS[0].url);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1E1E1C]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200/80 px-5 py-3.5 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-neutral-500" />
                <h3 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Header Cover
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {currentCoverUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCover(null);
                      onClose();
                    }}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    Remove cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  aria-label="Close cover picker"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs + Upload Action */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/70 px-5 py-2.5 dark:border-neutral-800">
              <div className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('official')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    activeTab === 'official'
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-[#262624] dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                  }`}
                >
                  Gallery ({COVER_PRESETS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('uploaded')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                    activeTab === 'uploaded'
                      ? 'bg-white text-neutral-900 shadow-2xs dark:bg-[#262624] dark:text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
                  }`}
                >
                  Uploaded ({uploadedCovers.length})
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {uploading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>{uploading ? 'Uploading...' : 'Upload image'}</span>
              </button>
            </div>

            {uploadError && (
              <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {uploadError}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'official' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {COVER_PRESETS.map((preset) => {
                    const isSelected = currentCoverUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          onSelectCover(preset.url);
                          onClose();
                        }}
                        className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-neutral-900 ring-2 ring-neutral-900/15 dark:border-blue-500 dark:ring-blue-500/20'
                            : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div
                          className="h-24 w-full overflow-hidden"
                          style={{ background: preset.fallbackGradient }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          />
                        </div>
                        {isSelected && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xs dark:bg-blue-600">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </span>
                        )}
                        <div className="bg-white px-2.5 py-2 text-xs font-medium text-neutral-700 dark:bg-[#242422] dark:text-neutral-200">
                          {preset.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : uploadedCovers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#F8F8F7] px-6 py-12 text-center dark:border-neutral-700 dark:bg-[#242422]">
                  <Upload className="h-6 w-6 text-neutral-400" />
                  <p className="mt-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    No uploaded covers yet
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Upload a JPG, PNG, or WebP banner to use across your projects and pages.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choose image</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {uploadedCovers.map((item) => {
                    const isSelected = currentCoverUrl === item.url;
                    return (
                      <div
                        key={item.id}
                        className={`group relative overflow-hidden rounded-xl border transition-all ${
                          isSelected
                            ? 'border-neutral-900 ring-2 ring-neutral-900/15 dark:border-blue-500 dark:ring-blue-500/20'
                            : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCover(item.url);
                            onClose();
                          }}
                          className="block w-full text-left"
                        >
                          <div className="h-24 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                            <img
                              src={item.url}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                          </div>
                          <div className="truncate bg-white px-2.5 py-2 text-xs font-medium text-neutral-700 dark:bg-[#242422] dark:text-neutral-200">
                            {item.name}
                          </div>
                        </button>
                        {isSelected && (
                          <span className="pointer-events-none absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white shadow-xs dark:bg-blue-600">
                            <Check className="h-3 w-3 stroke-[2.5]" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteUploaded(item.id)}
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                          title="Delete uploaded cover"
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
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
