export type TaskStatus = 'Backlog' | 'In Progress' | 'In Review' | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TaskDocTemplate = 'spec' | 'meeting' | 'blank';

export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
  tags: string;
  notes: string;
  docId?: string;
  docUrl?: string;
  docTitle?: string;
  docBlocks?: DocBlock[];
  dirtyTaskDoc?: boolean;
}

export type DocBlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'todo'
  | 'bullet'
  | 'numbered'
  | 'callout'
  | 'quote'
  | 'code'
  | 'divider'
  | 'page';

export interface DocBlock {
  id: string;
  type: DocBlockType;
  content: string;
  checked?: boolean;
  docId?: string;
  docUrl?: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  size?: string;
  appProperties?: Record<string, string>;
}

export interface ProjectDocPage {
  id: string;
  title: string;
  url: string;
  parentDocId?: string | null;
  blocks?: DocBlock[];
  dirty?: boolean;
  modifiedTime?: string;
}

export type ProjectTabView = 'page' | 'docs' | 'board' | 'table' | 'list' | 'files';

export type WorkspaceArea =
  | 'overview'
  | 'daily-planner'
  | 'project'
  | 'folder-group'
  | 'standalone-page'
  | 'sync-hub'
  | 'drive-browser';

export interface ProjectFolderGroup {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
}

export interface StandalonePage {
  id: string;
  title: string;
  icon: string;
  coverUrl: string | null;
  docUrl: string;
  parentDocId?: string | null;
  blocks: DocBlock[];
  dirty: boolean;
  lastSyncedAt: string | null;
  modifiedTime?: string;
}

export interface DailyTaskItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  starred?: boolean;
  tag: string; // 'Work' | 'Personal' | custom tag
  time?: string;
  createdAt: string;
  rolledOverFrom?: string; // Original YYYY-MM-DD when rolled over from a past day
}

export interface DailyHabitItem {
  id: string;
  title: string;
  category: string; // 'Work' | 'Personal' | custom
  completedDates: Record<string, boolean>; // YYYY-MM-DD -> true
  starredDates?: Record<string, boolean>; // YYYY-MM-DD -> true
}

export interface DailyHighlightItem {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string;
}

export interface DailyPlannerState {
  tasksByDate: Record<string, DailyTaskItem[]>;
  notesByDate: Record<string, string>;
  ideasByDate?: Record<string, string>;
  highlightsByDate?: Record<string, DailyHighlightItem[]>;
  habits: DailyHabitItem[];
  customTags: string[];
  tagColors?: Record<string, string>;
}

export interface ProjectWorkspace {
  id: string;
  title: string;
  icon: string;
  coverUrl: string | null;
  groupId?: string | null;
  driveFolderId: string | null;
  driveFolderName: string | null;
  driveFolderUrl: string | null;
  sheetId: string | null;
  sheetTitle: string | null;
  sheetTabName: string | null;
  sheetUrl: string | null;
  docId: string | null;
  docTitle: string | null;
  docUrl: string | null;
  blocks: DocBlock[];
  extraDocs: ProjectDocPage[];
  tasks: TaskItem[];
  driveFiles: DriveFileItem[];
  lastSyncedAt: string | null;
  dirtyDoc: boolean;
  dirtyTasks: boolean;
  isLoadingData?: boolean;
}

export interface PendingConfirmation {
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}

export interface SyncActivityEntry {
  id: string;
  timestamp: string;
  projectTitle: string;
  target: 'Drive' | 'Sheets' | 'Docs' | 'Workspace';
  action: string;
}
