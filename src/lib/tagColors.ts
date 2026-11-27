export type TaskTagColorKey =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'orange'
  | 'indigo';

export interface TaskTagColorTheme {
  key: TaskTagColorKey;
  label: string;
  swatchClass: string;
  textClass: string;
  filterActiveClass: string;
  filterInactiveClass: string;
  cardSurfaceClass: string;
  cardTopBarClass: string;
}

export const TASK_TAG_COLOR_PALETTE: TaskTagColorTheme[] = [
  {
    key: 'blue',
    label: 'Blue',
    swatchClass: 'bg-blue-500',
    textClass: 'text-blue-700 dark:text-blue-300',
    filterActiveClass:
      'bg-blue-600 text-white shadow-2xs dark:bg-blue-500 dark:text-white',
    filterInactiveClass:
      'bg-blue-50/90 text-blue-700 hover:bg-blue-100/80 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50',
    cardSurfaceClass:
      'border-blue-200/85 bg-blue-50/35 hover:border-blue-300 dark:border-blue-900/60 dark:bg-blue-950/20 dark:hover:border-blue-800',
    cardTopBarClass: 'bg-blue-500/80 dark:bg-blue-400/80',
  },
  {
    key: 'violet',
    label: 'Violet',
    swatchClass: 'bg-violet-500',
    textClass: 'text-violet-700 dark:text-violet-300',
    filterActiveClass:
      'bg-violet-600 text-white shadow-2xs dark:bg-violet-500 dark:text-white',
    filterInactiveClass:
      'bg-violet-50/90 text-violet-700 hover:bg-violet-100/80 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/50',
    cardSurfaceClass:
      'border-violet-200/85 bg-violet-50/35 hover:border-violet-300 dark:border-violet-900/60 dark:bg-violet-950/20 dark:hover:border-violet-800',
    cardTopBarClass: 'bg-violet-500/80 dark:bg-violet-400/80',
  },
  {
    key: 'emerald',
    label: 'Emerald',
    swatchClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    filterActiveClass:
      'bg-emerald-600 text-white shadow-2xs dark:bg-emerald-500 dark:text-white',
    filterInactiveClass:
      'bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
    cardSurfaceClass:
      'border-emerald-200/85 bg-emerald-50/35 hover:border-emerald-300 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:hover:border-emerald-800',
    cardTopBarClass: 'bg-emerald-500/80 dark:bg-emerald-400/80',
  },
  {
    key: 'amber',
    label: 'Amber',
    swatchClass: 'bg-amber-500',
    textClass: 'text-amber-800 dark:text-amber-300',
    filterActiveClass:
      'bg-amber-600 text-white shadow-2xs dark:bg-amber-500 dark:text-white',
    filterInactiveClass:
      'bg-amber-50/90 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50',
    cardSurfaceClass:
      'border-amber-200/85 bg-amber-50/35 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/20 dark:hover:border-amber-800',
    cardTopBarClass: 'bg-amber-500/80 dark:bg-amber-400/80',
  },
  {
    key: 'rose',
    label: 'Rose',
    swatchClass: 'bg-rose-500',
    textClass: 'text-rose-700 dark:text-rose-300',
    filterActiveClass:
      'bg-rose-600 text-white shadow-2xs dark:bg-rose-500 dark:text-white',
    filterInactiveClass:
      'bg-rose-50/90 text-rose-700 hover:bg-rose-100/80 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50',
    cardSurfaceClass:
      'border-rose-200/85 bg-rose-50/35 hover:border-rose-300 dark:border-rose-900/60 dark:bg-rose-950/20 dark:hover:border-rose-800',
    cardTopBarClass: 'bg-rose-500/80 dark:bg-rose-400/80',
  },
  {
    key: 'cyan',
    label: 'Teal',
    swatchClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    filterActiveClass:
      'bg-cyan-600 text-white shadow-2xs dark:bg-cyan-500 dark:text-white',
    filterInactiveClass:
      'bg-cyan-50/90 text-cyan-700 hover:bg-cyan-100/80 dark:bg-cyan-950/50 dark:text-cyan-300 dark:hover:bg-cyan-900/50',
    cardSurfaceClass:
      'border-cyan-200/85 bg-cyan-50/35 hover:border-cyan-300 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:hover:border-cyan-800',
    cardTopBarClass: 'bg-cyan-500/80 dark:bg-cyan-400/80',
  },
  {
    key: 'orange',
    label: 'Orange',
    swatchClass: 'bg-orange-500',
    textClass: 'text-orange-700 dark:text-orange-300',
    filterActiveClass:
      'bg-orange-600 text-white shadow-2xs dark:bg-orange-500 dark:text-white',
    filterInactiveClass:
      'bg-orange-50/90 text-orange-700 hover:bg-orange-100/80 dark:bg-orange-950/50 dark:text-orange-300 dark:hover:bg-orange-900/50',
    cardSurfaceClass:
      'border-orange-200/85 bg-orange-50/35 hover:border-orange-300 dark:border-orange-900/60 dark:bg-orange-950/20 dark:hover:border-orange-800',
    cardTopBarClass: 'bg-orange-500/80 dark:bg-orange-400/80',
  },
  {
    key: 'indigo',
    label: 'Indigo',
    swatchClass: 'bg-indigo-500',
    textClass: 'text-indigo-700 dark:text-indigo-300',
    filterActiveClass:
      'bg-indigo-600 text-white shadow-2xs dark:bg-indigo-500 dark:text-white',
    filterInactiveClass:
      'bg-indigo-50/90 text-indigo-700 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50',
    cardSurfaceClass:
      'border-indigo-200/85 bg-indigo-50/35 hover:border-indigo-300 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:border-indigo-800',
    cardTopBarClass: 'bg-indigo-500/80 dark:bg-indigo-400/80',
  },
];

const TAG_COLORS_STORAGE_KEY = 'folio_task_tag_colors_v1';

export function loadCustomTagColors(): Record<string, TaskTagColorKey> {
  try {
    const raw = localStorage.getItem(TAG_COLORS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCustomTagColor(tag: string, colorKey: TaskTagColorKey): Record<string, TaskTagColorKey> {
  const normalized = tag.trim().toLowerCase();
  if (!normalized) return loadCustomTagColors();
  const current = loadCustomTagColors();
  const next: Record<string, TaskTagColorKey> = {
    ...current,
    [normalized]: colorKey,
  };
  try {
    localStorage.setItem(TAG_COLORS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('folio-tag-colors-updated'));
  } catch {
    // ignore storage errors
  }
  return next;
}

export function parseTaskTags(tagsRaw: string | undefined | null): string[] {
  if (!tagsRaw) return [];
  return tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function getTaskTagColorTheme(
  tag: string,
  customOverrides?: Record<string, TaskTagColorKey>
): TaskTagColorTheme {
  const lower = tag.trim().toLowerCase();
  const overrides = customOverrides || loadCustomTagColors();
  const explicitKey =
    overrides[lower] ||
    (lower.includes('design') || lower.includes('ui') || lower.includes('ux') || lower.includes('brand')
      ? 'violet'
      : lower.includes('eng') || lower.includes('dev') || lower.includes('tech') || lower.includes('api') || lower.includes('code') || lower === 'work'
      ? 'blue'
      : lower.includes('launch') || lower.includes('market') || lower.includes('growth') || lower.includes('pr')
      ? 'orange'
      : lower.includes('research') || lower.includes('data') || lower.includes('analytics') || lower.includes('docs')
      ? 'cyan'
      : lower.includes('bug') || lower.includes('fix') || lower.includes('urgent') || lower.includes('blocker') || lower.includes('qa')
      ? 'rose'
      : lower.includes('product') || lower.includes('ops') || lower.includes('finance') || lower === 'personal'
      ? 'emerald'
      : lower.includes('review') || lower.includes('plan') || lower.includes('roadmap')
      ? 'amber'
      : lower.includes('strategy') || lower.includes('arch')
      ? 'indigo'
      : null);

  if (explicitKey) {
    const found = TASK_TAG_COLOR_PALETTE.find((c) => c.key === explicitKey);
    if (found) return found;
  }

  let hash = 0;
  for (let i = 0; i < lower.length; i++) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  return TASK_TAG_COLOR_PALETTE[hash % TASK_TAG_COLOR_PALETTE.length];
}
