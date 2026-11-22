import {
  DocBlock,
  DriveFileItem,
  ProjectFolderGroup,
  ProjectWorkspace,
  StandalonePage,
  TaskItem,
} from '../types/workspace';
import { getCoverPresetByIndex } from './coverAssets';
import {
  buildStandaloneDocStarterBlocks,
  buildTaskDocStarterBlocks,
  uid,
} from './googleWorkspaceApi';

export const GUEST_USER_ID = 'guest_local';
export const GUEST_MODE_STORAGE_KEY = 'folio_guest_mode_active';
export const GUEST_PROJECTS_STORAGE_KEY = 'folio_guest_projects_v1';
export const GUEST_PAGES_STORAGE_KEY = 'folio_guest_standalone_pages_v1';

export function isGuestModeStored(): boolean {
  try {
    return localStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setGuestModeStored(active: boolean): void {
  try {
    if (active) {
      localStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function createLocalWorkspaceProject(
  title: string,
  icon: string,
  coverIndex: number
): ProjectWorkspace {
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);
  const projectId = uid('local_proj');
  const folderId = uid('local_folder');
  const sheetId = uid('local_sheet');
  const docId = uid('local_doc');
  const preset = getCoverPresetByIndex(coverIndex);

  const starterBlocks: DocBlock[] = [
    { id: uid('blk'), type: 'h1', content: `${title} Overview` },
    {
      id: uid('blk'),
      type: 'callout',
      content:
        'Guest Mode (Local Storage): All pages, tasks, documents, and files in this project are saved directly in your browser on this device.',
    },
    { id: uid('blk'), type: 'h2', content: 'Objectives' },
    {
      id: uid('blk'),
      type: 'todo',
      checked: false,
      content: 'Define scope and key deliverables',
    },
    {
      id: uid('blk'),
      type: 'todo',
      checked: false,
      content: 'Organize tasks and nested document pages',
    },
    { id: uid('blk'), type: 'h2', content: 'Notes' },
    {
      id: uid('blk'),
      type: 'paragraph',
      content:
        'Type / anywhere below to add headings, checklists, callouts, sub-pages, or code blocks.',
    },
  ];

  const baseTasks: TaskItem[] = [
    {
      id: uid('task'),
      title: 'Kickoff project brief and timeline',
      status: 'In Progress',
      priority: 'High',
      assignee: 'Guest',
      dueDate: today,
      tags: 'Planning',
      notes: '',
    },
    {
      id: uid('task'),
      title: 'Draft milestones & action items',
      status: 'Backlog',
      priority: 'Medium',
      assignee: 'Guest',
      dueDate: today,
      tags: 'Roadmap',
      notes: '',
    },
  ];

  const starterTasks: TaskItem[] = baseTasks.map((t) => {
    const taskDocId = uid('local_tdoc');
    const blocks = buildTaskDocStarterBlocks(t, 'spec');
    return {
      ...t,
      docId: taskDocId,
      docTitle: t.title,
      docUrl: '',
      docBlocks: blocks,
      dirtyTaskDoc: false,
    };
  });

  const driveFiles: DriveFileItem[] = [
    {
      id: docId,
      name: `${title} — Brief`,
      mimeType: 'application/vnd.google-apps.document',
      modifiedTime: nowIso,
      appProperties: { folioProjectBrief: 'true' },
    },
    {
      id: sheetId,
      name: `${title} — Tasks`,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      modifiedTime: nowIso,
    },
    ...starterTasks.map((t) => ({
      id: t.docId || uid('local_file'),
      name: t.docTitle || t.title,
      mimeType: 'application/vnd.google-apps.document',
      modifiedTime: nowIso,
      appProperties: { folioTaskDoc: 'true', folioTaskId: t.id },
    })),
  ];

  return {
    id: projectId,
    title,
    icon,
    coverUrl: preset.url,
    driveFolderId: folderId,
    driveFolderName: title,
    driveFolderUrl: null,
    sheetId,
    sheetTitle: `${title} — Tasks`,
    sheetTabName: 'Tasks',
    sheetUrl: null,
    docId,
    docTitle: `${title} — Brief`,
    docUrl: null,
    blocks: starterBlocks,
    extraDocs: [],
    tasks: starterTasks,
    driveFiles,
    lastSyncedAt: nowIso,
    dirtyDoc: false,
    dirtyTasks: false,
  };
}

export function createLocalStandalonePage(options: {
  title: string;
  icon?: string;
  parentDocId?: string | null;
  blocks?: DocBlock[];
}): StandalonePage {
  const nowIso = new Date().toISOString();
  const cleanTitle = options.title.trim() || 'Untitled Page';
  return {
    id: uid('local_page'),
    title: cleanTitle,
    icon: options.icon || (options.parentDocId ? '📑' : '📄'),
    coverUrl: null,
    docUrl: '',
    parentDocId: options.parentDocId || null,
    blocks:
      options.blocks && options.blocks.length > 0
        ? options.blocks
        : buildStandaloneDocStarterBlocks(cleanTitle, 'blank'),
    dirty: false,
    lastSyncedAt: nowIso,
    modifiedTime: nowIso,
  };
}

export function saveGuestProjects(projects: ProjectWorkspace[]): void {
  try {
    localStorage.setItem(GUEST_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // ignore quota errors
  }
}

export function saveGuestStandalonePages(pages: StandalonePage[]): void {
  try {
    localStorage.setItem(GUEST_PAGES_STORAGE_KEY, JSON.stringify(pages));
  } catch {
    // ignore quota errors
  }
}

export function loadGuestWorkspace(
  savedGroupMap: Record<string, string> = {},
  savedRemoved: Record<string, boolean> = {}
): {
  projects: ProjectWorkspace[];
  standalonePages: StandalonePage[];
} {
  let projects: ProjectWorkspace[] | null = null;
  let standalonePages: StandalonePage[] | null = null;

  try {
    const rawProjects = localStorage.getItem(GUEST_PROJECTS_STORAGE_KEY);
    if (rawProjects !== null) {
      projects = JSON.parse(rawProjects);
    }
    const rawPages = localStorage.getItem(GUEST_PAGES_STORAGE_KEY);
    if (rawPages !== null) {
      standalonePages = JSON.parse(rawPages);
    }
  } catch {
    // ignore parse failure
  }

  if (projects === null) {
    const starterProject = createLocalWorkspaceProject(
      'Personal Workspace & Roadmap',
      '🚀',
      0
    );
    projects = [starterProject];
    saveGuestProjects(projects);
  }

  if (standalonePages === null) {
    const starterPage = createLocalStandalonePage({
      title: 'Quick Notes & Scratchpad',
      icon: '📝',
    });
    standalonePages = [starterPage];
    saveGuestStandalonePages(standalonePages);
  }

  const visibleProjects = (projects || [])
    .filter((p) => !savedRemoved[p.id])
    .map((p) => ({
      ...p,
      groupId: savedGroupMap[p.id] || p.groupId || null,
    }));

  const visiblePages = (standalonePages || []).filter(
    (pg) => !savedRemoved[pg.id]
  );

  return {
    projects: visibleProjects,
    standalonePages: visiblePages,
  };
}

export function exportGuestWorkspaceToFile(data: {
  projects: ProjectWorkspace[];
  standalonePages: StandalonePage[];
  folderGroups: ProjectFolderGroup[];
}): void {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `folio-local-workspace-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
