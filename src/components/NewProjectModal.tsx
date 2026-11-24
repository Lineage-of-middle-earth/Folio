import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { COVER_PRESETS } from '../lib/coverAssets';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    title: string,
    icon: string,
    coverIndex: number,
    customCoverUrl?: string
  ) => Promise<void>;
}

interface UploadedCoverItem {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

const UPLOADED_COVERS_STORAGE_KEY = 'folio_uploaded_header_covers_v1';

const QUICK_ICONS = ['📋', '📐', '🗂️', '🧭', '📦', '⚡', '🌿', '🔬'];

const ALL_ICON_GROUPS: Array<{
  category: string;
  icons: Array<{ emoji: string; keywords: string }>;
}> = [
  {
    category: 'Work & Documents',
    icons: [
      { emoji: '📋', keywords: 'clipboard checklist plan' },
      { emoji: '📝', keywords: 'memo note write doc' },
      { emoji: '📄', keywords: 'page document file' },
      { emoji: '📑', keywords: 'tabs pages bookmark' },
      { emoji: '🗂️', keywords: 'folder dividers index' },
      { emoji: '📁', keywords: 'folder directory' },
      { emoji: '📂', keywords: 'open folder' },
      { emoji: '📊', keywords: 'chart graph analytics sheet' },
      { emoji: '📈', keywords: 'growth chart upward' },
      { emoji: '📅', keywords: 'calendar schedule date' },
      { emoji: '📌', keywords: 'pin tack important' },
      { emoji: '📎', keywords: 'paperclip attach' },
      { emoji: '💼', keywords: 'briefcase business work' },
      { emoji: '🧾', keywords: 'receipt invoice finance' },
      { emoji: '📚', keywords: 'books library wiki' },
      { emoji: '🗒️', keywords: 'notepad scratchpad' },
    ],
  },
  {
    category: 'Product, Tech & Design',
    icons: [
      { emoji: '📐', keywords: 'ruler design geometry' },
      { emoji: '🎨', keywords: 'art palette creative' },
      { emoji: '💻', keywords: 'laptop computer code' },
      { emoji: '🖥️', keywords: 'desktop monitor screen' },
      { emoji: '📱', keywords: 'mobile phone app' },
      { emoji: '⚙️', keywords: 'gear settings config' },
      { emoji: '🔧', keywords: 'wrench tool fix' },
      { emoji: '🛠️', keywords: 'tools build engineering' },
      { emoji: '🧪', keywords: 'test lab experiment' },
      { emoji: '🔬', keywords: 'microscope science research' },
      { emoji: '🚀', keywords: 'rocket launch startup ship' },
      { emoji: '⚡', keywords: 'lightning fast sprint energy' },
      { emoji: '🤖', keywords: 'robot ai automation' },
      { emoji: '🧩', keywords: 'puzzle module integration' },
      { emoji: '🔐', keywords: 'lock security auth' },
      { emoji: '🌐', keywords: 'globe web internet' },
    ],
  },
  {
    category: 'Goals, Strategy & Teams',
    icons: [
      { emoji: '🎯', keywords: 'target goal okr focus' },
      { emoji: '🧭', keywords: 'compass roadmap navigation' },
      { emoji: '🗺️', keywords: 'map strategy journey' },
      { emoji: '🏆', keywords: 'trophy win award' },
      { emoji: '⭐', keywords: 'star favorite important' },
      { emoji: '🔥', keywords: 'fire hot priority streak' },
      { emoji: '💡', keywords: 'idea lightbulb brainstorm' },
      { emoji: '📣', keywords: 'megaphone marketing launch' },
      { emoji: '🤝', keywords: 'handshake client partner' },
      { emoji: '👥', keywords: 'team people group' },
      { emoji: '💬', keywords: 'chat feedback discussion' },
      { emoji: '📦', keywords: 'package delivery release' },
      { emoji: '🏷️', keywords: 'tag label pricing' },
      { emoji: '💰', keywords: 'money budget revenue' },
      { emoji: '✅', keywords: 'check done complete' },
      { emoji: '🔔', keywords: 'bell reminder alert' },
    ],
  },
  {
    category: 'Nature, Travel & Life',
    icons: [
      { emoji: '🌿', keywords: 'herb plant calm nature' },
      { emoji: '🌱', keywords: 'seedling grow start' },
      { emoji: '🌲', keywords: 'tree forest evergreen' },
      { emoji: '🌻', keywords: 'sunflower bright' },
      { emoji: '🌊', keywords: 'wave ocean flow' },
      { emoji: '⛰️', keywords: 'mountain peak summit' },
      { emoji: '☀️', keywords: 'sun morning day' },
      { emoji: '🌙', keywords: 'moon night evening' },
      { emoji: '✨', keywords: 'sparkles magic polish' },
      { emoji: '🏠', keywords: 'home house personal' },
      { emoji: '✈️', keywords: 'plane travel trip' },
      { emoji: '☕', keywords: 'coffee break cafe' },
      { emoji: '🎧', keywords: 'headphones music focus' },
      { emoji: '📷', keywords: 'camera photo media' },
      { emoji: '🎬', keywords: 'clapper video film' },
      { emoji: '💎', keywords: 'gem diamond quality' },
    ],
  },
];

function loadUploadedCovers(): UploadedCoverItem[] {
  try {
    const raw = localStorage.getItem(UPLOADED_COVERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUploadedCovers(items: UploadedCoverItem[]): void {
  try {
    localStorage.setItem(UPLOADED_COVERS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1400;
        const maxHeight = 600;
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(QUICK_ICONS[0]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [uploadedCovers, setUploadedCovers] = useState<UploadedCoverItem[]>(() =>
    loadUploadedCovers()
  );

  // Separate popups for Icon Picker and Header Cover Picker
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [coverPickerTab, setCoverPickerTab] = useState<'official' | 'uploaded'>(
    'official'
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowIconPicker(false);
      setShowCoverPicker(false);
      setIconSearch('');
      setUploadError(null);
    }
  }, [isOpen]);

  const filteredIconGroups = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return ALL_ICON_GROUPS;
    return ALL_ICON_GROUPS.map((grp) => ({
      ...grp,
      icons: grp.icons.filter(
        (item) =>
          item.emoji.includes(q) ||
          item.keywords.toLowerCase().includes(q) ||
          grp.category.toLowerCase().includes(q)
      ),
    })).filter((grp) => grp.icons.length > 0);
  }, [iconSearch]);

  const quickIconList = useMemo(() => {
    if (QUICK_ICONS.includes(icon)) return QUICK_ICONS;
    return [icon, ...QUICK_ICONS.slice(0, QUICK_ICONS.length - 1)];
  }, [icon]);

  const activeOfficialPreset = COVER_PRESETS[coverIndex % COVER_PRESETS.length];
  const activeCoverPreviewUrl = customCoverUrl || activeOfficialPreset.url;
  const activeCoverLabel = customCoverUrl
    ? uploadedCovers.find((c) => c.url === customCoverUrl)?.name || 'Uploaded Cover'
    : activeOfficialPreset.label;

  const handleCoverFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, etc.).');
      return;
    }
    setUploadError(null);
    setUploadingCover(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      const newCover: UploadedCoverItem = {
        id: `cov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: file.name.replace(/\.[^.]+$/, '') || 'Custom Cover',
        url: dataUrl,
        uploadedAt: new Date().toISOString(),
      };
      const nextCovers = [newCover, ...uploadedCovers].slice(0, 16);
      setUploadedCovers(nextCovers);
      saveUploadedCovers(nextCovers);
      setCustomCoverUrl(newCover.url);
      setCoverPickerTab('uploaded');
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Failed to process uploaded image.'
      );
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteUploadedCover = (coverId: string) => {
    const target = uploadedCovers.find((c) => c.id === coverId);
    const next = uploadedCovers.filter((c) => c.id !== coverId);
    setUploadedCovers(next);
    saveUploadedCovers(next);
    if (target && customCoverUrl === target.url) {
      setCustomCoverUrl(null);
    }
  };

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
      await onCreate(trimmed, icon, coverIndex, customCoverUrl || undefined);
      setTitle('');
      setCustomCoverUrl(null);
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

              {/* Page Icon Picker with + Button to Open Full Icon List */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Page Icon
                </label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {quickIconList.map((em) => (
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
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowIconPicker(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-[#F8F8F7] text-neutral-600 transition-colors hover:border-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                    title="Browse all icons"
                    aria-label="Open all icons"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>

              {/* Header Cover Section with Upload & Separate Popup for Uploaded + Official Covers */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Header Cover
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCoverPickerTab('uploaded');
                        setShowCoverPicker(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <Upload className="h-3 w-3" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverPickerTab('official');
                        setShowCoverPicker(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-[#F8F8F7] px-2 py-1 text-[11px] font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200 dark:hover:bg-neutral-800"
                    >
                      <ImageIcon className="h-3 w-3" />
                      <span>Browse Covers</span>
                    </button>
                  </div>
                </div>

                {/* Selected Cover Preview Card (Click opens the Header Cover Popup) */}
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(true)}
                  className="group relative mt-1.5 block w-full overflow-hidden rounded-lg border border-neutral-200 text-left transition-all hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
                >
                  <div
                    className="h-20 w-full"
                    style={{ background: activeOfficialPreset.fallbackGradient }}
                  >
                    <img
                      src={activeCoverPreviewUrl}
                      alt={activeCoverLabel}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-[#F8F8F7] px-3 py-1.5 text-[11px] dark:bg-[#191918]">
                    <span className="flex min-w-0 items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
                      <span className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {customCoverUrl ? 'Uploaded' : 'Official'}
                      </span>
                      <span className="truncate font-medium">{activeCoverLabel}</span>
                    </span>
                    <span className="shrink-0 font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                      Change Cover
                    </span>
                  </div>
                </button>
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

          {/* Separate Popup 1: All Page Icons Picker */}
          <AnimatePresence>
            {showIconPicker && (
              <motion.div
                key="icon-picker-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowIconPicker(false);
                }}
              >
                <motion.div
                  key="icon-picker-panel"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{icon}</span>
                      <h4 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        Choose Page Icon
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowIconPicker(false)}
                      className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                      aria-label="Close icon picker"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        autoFocus
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Search icons (e.g. rocket, folder, chart, design)..."
                        className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] py-1.5 pl-8 pr-3 text-xs text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    {filteredIconGroups.length === 0 ? (
                      <p className="py-8 text-center text-xs text-neutral-400">
                        No icons matched &ldquo;{iconSearch}&rdquo;.
                      </p>
                    ) : (
                      filteredIconGroups.map((group) => (
                        <div key={group.category}>
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            {group.category}
                          </div>
                          <div className="grid grid-cols-8 gap-1.5">
                            {group.icons.map((item) => {
                              const selected = icon === item.emoji;
                              return (
                                <button
                                  key={item.emoji}
                                  type="button"
                                  onClick={() => {
                                    setIcon(item.emoji);
                                    setShowIconPicker(false);
                                  }}
                                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-all ${
                                    selected
                                      ? 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900 dark:border-blue-500 dark:bg-neutral-800 dark:ring-blue-500'
                                      : 'border-transparent hover:border-neutral-200 hover:bg-neutral-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-800'
                                  }`}
                                  title={item.keywords}
                                >
                                  {item.emoji}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Separate Popup 2: Header Cover Gallery (Official & Uploaded Covers) */}
          <AnimatePresence>
            {showCoverPicker && (
              <motion.div
                key="cover-picker-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCoverPicker(false);
                }}
              >
                <motion.div
                  key="cover-picker-panel"
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 6 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
                >
                  {/* Popup Header */}
                  <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
                      <h4 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        Header Cover Gallery
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCoverPicker(false)}
                      className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
                      aria-label="Close cover picker"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tabs: Official Header Covers vs Uploaded Header Covers */}
                  <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-2.5 dark:border-neutral-800">
                    <div className="flex items-center gap-1 rounded-lg bg-[#F8F8F7] p-1 dark:bg-[#191918]">
                      <button
                        type="button"
                        onClick={() => setCoverPickerTab('official')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          coverPickerTab === 'official'
                            ? 'bg-white text-neutral-900 shadow-2xs dark:bg-[#2A2A27] dark:text-neutral-50'
                            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Official Covers ({COVER_PRESETS.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverPickerTab('uploaded')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          coverPickerTab === 'uploaded'
                            ? 'bg-white text-neutral-900 shadow-2xs dark:bg-[#2A2A27] dark:text-neutral-50'
                            : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
                        }`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Uploaded ({uploadedCovers.length})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{uploadingCover ? 'Uploading...' : 'Upload Image'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverFileSelected}
                      className="hidden"
                    />
                  </div>

                  {/* Popup Body */}
                  <div className="flex-1 overflow-y-auto p-5">
                    {uploadError && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        {uploadError}
                      </div>
                    )}

                    {coverPickerTab === 'official' ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {COVER_PRESETS.map((preset, idx) => {
                          const isSelected = !customCoverUrl && coverIndex === idx;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setCustomCoverUrl(null);
                                setCoverIndex(idx);
                                setShowCoverPicker(false);
                              }}
                              className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-neutral-900 ring-2 ring-neutral-900/20 dark:border-blue-500 dark:ring-blue-500/30'
                                  : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500'
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
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              </div>
                              <div className="flex items-center justify-between bg-[#F8F8F7] px-3 py-2 dark:bg-[#191918]">
                                <span className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                  {preset.label}
                                </span>
                                {isSelected && (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-blue-600">
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Upload Dropzone */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-[#F8F8F7] px-4 py-6 text-center transition-colors hover:border-neutral-500 hover:bg-neutral-100/70 dark:border-neutral-700 dark:bg-[#191918] dark:hover:border-neutral-500"
                        >
                          <Upload className="h-6 w-6 text-neutral-400" />
                          <span className="mt-2 text-xs font-medium text-neutral-800 dark:text-neutral-200">
                            {uploadingCover
                              ? 'Processing cover image...'
                              : 'Click to upload a custom header cover'}
                          </span>
                          <span className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                            PNG, JPG, or WebP · Wide landscape images look best
                          </span>
                        </button>

                        {uploadedCovers.length === 0 ? (
                          <p className="py-4 text-center text-xs text-neutral-400">
                            No uploaded covers yet. Upload an image above to save it here for reuse.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {uploadedCovers.map((cov) => {
                              const isSelected = customCoverUrl === cov.url;
                              return (
                                <div
                                  key={cov.id}
                                  className={`group relative overflow-hidden rounded-xl border transition-all ${
                                    isSelected
                                      ? 'border-neutral-900 ring-2 ring-neutral-900/20 dark:border-blue-500 dark:ring-blue-500/30'
                                      : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCustomCoverUrl(cov.url);
                                      setShowCoverPicker(false);
                                    }}
                                    className="block w-full text-left"
                                  >
                                    <div className="h-24 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                                      <img
                                        src={cov.url}
                                        alt={cov.name}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between bg-[#F8F8F7] px-3 py-2 dark:bg-[#191918]">
                                      <span className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-200">
                                        {cov.name}
                                      </span>
                                      {isSelected && (
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white dark:bg-blue-600">
                                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteUploadedCover(cov.id);
                                    }}
                                    className="absolute right-2 top-2 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                                    title="Remove uploaded cover"
                                    aria-label="Remove uploaded cover"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
