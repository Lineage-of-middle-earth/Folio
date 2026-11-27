import {
  DocBlock,
  DriveFileItem,
  ProjectDocPage,
  ProjectWorkspace,
  StandalonePage,
  TaskDocTemplate,
  TaskItem,
  TaskPriority,
  TaskStatus,
} from '../types/workspace';
import { getCoverPresetByIndex } from './coverAssets';

export class AuthExpiredError extends Error {
  constructor(message = 'Google Workspace session expired. Please sign in again.') {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

const ROOT_FOLDER_NAME = 'Folio Workspace';
const TASK_DOCS_FOLDER_NAME = 'Task Docs';
const TASK_HEADERS = [
  'ID',
  'Title',
  'Status',
  'Priority',
  'Assignee',
  'Due Date',
  'Tags',
  'Google Doc Link',
  'Doc ID',
];

const VALID_STATUSES: TaskStatus[] = ['Backlog', 'In Progress', 'In Review', 'Done'];
const VALID_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
}

async function workspaceFetch<T>(
  url: string,
  token: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    throw new AuthExpiredError();
  }

  if (!res.ok) {
    let message = `Google API error (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        message = errBody.error.message;
      }
    } catch {
      // Ignore JSON parse failure
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

// ============================================================================
// GOOGLE DRIVE API
// ============================================================================

export async function findOrCreateRootFolder(token: string): Promise<{
  id: string;
  name: string;
  webViewLink: string;
}> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escapeDriveQuery(
    ROOT_FOLDER_NAME
  )}' and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,webViewLink)&spaces=drive&pageSize=5`;

  const searchRes = await workspaceFetch<{
    files?: Array<{ id: string; name: string; webViewLink?: string }>;
  }>(searchUrl, token);

  if (searchRes.files && searchRes.files.length > 0) {
    const existing = searchRes.files[0];
    return {
      id: existing.id,
      name: existing.name,
      webViewLink:
        existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  const created = await workspaceFetch<{
    id: string;
    name: string;
    webViewLink?: string;
  }>('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', token, {
    method: 'POST',
    body: JSON.stringify({
      name: ROOT_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { folioRoot: 'true' },
    }),
  });

  return {
    id: created.id,
    name: created.name,
    webViewLink:
      created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

export async function listFolderFiles(
  token: string,
  folderId: string
): Promise<DriveFileItem[]> {
  const q = `'${escapeDriveQuery(folderId)}' in parents and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,webViewLink,modifiedTime,size,appProperties)&orderBy=modifiedTime desc&pageSize=100`;
  const res = await workspaceFetch<{ files?: DriveFileItem[] }>(url, token);
  return res.files || [];
}

export async function findOrCreateTaskDocsFolder(
  token: string,
  parentFolderId: string
): Promise<string> {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escapeDriveQuery(
    TASK_DOCS_FOLDER_NAME
  )}' and '${escapeDriveQuery(parentFolderId)}' in parents and trashed=false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name)&spaces=drive&pageSize=5`;

  const searchRes = await workspaceFetch<{
    files?: Array<{ id: string; name: string }>;
  }>(searchUrl, token);

  if (searchRes.files && searchRes.files.length > 0) {
    return searchRes.files[0].id;
  }

  const created = await workspaceFetch<{ id: string }>(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        name: TASK_DOCS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
        appProperties: { folioTaskDocsFolder: 'true' },
      }),
    }
  );
  return created.id;
}

export async function searchDriveFiles(
  token: string,
  queryText: string,
  mimeTypeFilter?: 'folder' | 'sheet' | 'doc' | 'all'
): Promise<DriveFileItem[]> {
  const clauses = ['trashed=false'];
  if (queryText.trim()) {
    clauses.push(`name contains '${escapeDriveQuery(queryText.trim())}'`);
  }
  if (mimeTypeFilter === 'folder') {
    clauses.push(`mimeType='application/vnd.google-apps.folder'`);
  } else if (mimeTypeFilter === 'sheet') {
    clauses.push(`mimeType='application/vnd.google-apps.spreadsheet'`);
  } else if (mimeTypeFilter === 'doc') {
    clauses.push(`mimeType='application/vnd.google-apps.document'`);
  }

  const q = clauses.join(' and ');
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=40`;
  const res = await workspaceFetch<{ files?: DriveFileItem[] }>(url, token);
  return res.files || [];
}

export async function uploadFileToDriveFolder(
  token: string,
  folderId: string,
  file: File
): Promise<DriveFileItem> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime,size',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (res.status === 401) {
    throw new AuthExpiredError();
  }
  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status})`);
  }
  return res.json();
}

export async function renameDriveFile(
  token: string,
  fileId: string,
  newName: string
): Promise<void> {
  await workspaceFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: newName }),
    }
  );
}

export async function trashDriveFile(token: string, fileId: string): Promise<void> {
  await workspaceFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ trashed: true }),
    }
  );
}

export async function permanentlyDeleteDriveFile(
  token: string,
  fileId: string
): Promise<void> {
  await workspaceFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    token,
    {
      method: 'DELETE',
    }
  );
}

export async function createDriveFolder(
  token: string,
  name: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const body: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    appProperties: { folioProject: 'true' },
  };
  if (parentFolderId) {
    body.parents = [parentFolderId];
  }
  return workspaceFetch<DriveFileItem>(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,modifiedTime',
    token,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

async function moveFileToFolder(
  token: string,
  fileId: string,
  targetFolderId: string
): Promise<void> {
  const fileMeta = await workspaceFetch<{ parents?: string[] }>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=parents`,
    token
  );
  const previousParents = (fileMeta.parents || []).join(',');
  const params = new URLSearchParams({
    addParents: targetFolderId,
    fields: 'id,parents',
  });
  if (previousParents) {
    params.set('removeParents', previousParents);
  }
  await workspaceFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    token,
    { method: 'PATCH', body: JSON.stringify({}) }
  );
}

// ============================================================================
// GOOGLE SHEETS API
// ============================================================================

function normalizeStatus(raw: string): TaskStatus {
  const lower = (raw || '').trim().toLowerCase();
  if (lower.includes('progress') || lower === 'doing' || lower === 'active') {
    return 'In Progress';
  }
  if (lower.includes('review') || lower === 'qa' || lower === 'testing') {
    return 'In Review';
  }
  if (lower === 'done' || lower === 'complete' || lower === 'completed') {
    return 'Done';
  }
  return 'Backlog';
}

function normalizePriority(raw: string): TaskPriority {
  const lower = (raw || '').trim().toLowerCase();
  if (lower === 'urgent' || lower === 'critical' || lower === 'p0') return 'Urgent';
  if (lower === 'high' || lower === 'p1') return 'High';
  if (lower === 'low' || lower === 'p3') return 'Low';
  return 'Medium';
}

export async function fetchSheetTasks(
  token: string,
  spreadsheetId: string
): Promise<{
  sheetTitle: string;
  sheetTabName: string;
  sheetUrl: string;
  tasks: TaskItem[];
}> {
  const meta = await workspaceFetch<{
    properties?: { title?: string };
    spreadsheetUrl?: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=properties.title,spreadsheetUrl,sheets.properties.title`,
    token
  );

  const sheetTitle = meta.properties?.title || 'Project Tasks';
  const sheetUrl =
    meta.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const tabs = (meta.sheets || [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));

  const preferredTab =
    tabs.find((t) => t.toLowerCase() === 'tasks') || tabs[0] || 'Sheet1';

  const range = `'${preferredTab.replace(/'/g, "''")}'!A1:J500`;
  const valuesRes = await workspaceFetch<{ values?: string[][] }>(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    token
  );

  const rows = valuesRes.values || [];
  if (rows.length === 0) {
    return { sheetTitle, sheetTabName: preferredTab, sheetUrl, tasks: [] };
  }

  const headerRow = rows[0].map((h) => h.trim().toLowerCase());
  const findCol = (candidates: string[], fallbackIndex: number) => {
    const idx = headerRow.findIndex((h) => candidates.some((c) => h.includes(c)));
    return idx >= 0 ? idx : fallbackIndex;
  };

  const looksLikeHeader =
    headerRow.some((h) =>
      ['title', 'task', 'name', 'status', 'priority', 'id'].some((k) => h.includes(k))
    );

  const idIdx = looksLikeHeader ? findCol(['id'], -1) : -1;
  const titleIdx = looksLikeHeader ? findCol(['title', 'task', 'name', 'item'], 0) : 0;
  const statusIdx = looksLikeHeader ? findCol(['status', 'stage', 'state'], 1) : 2;
  const priorityIdx = looksLikeHeader ? findCol(['priority', 'urgency'], 2) : 3;
  const assigneeIdx = looksLikeHeader ? findCol(['assignee', 'owner', 'who'], 3) : 4;
  const dueIdx = looksLikeHeader ? findCol(['due', 'date', 'deadline'], 4) : 5;
  const tagsIdx = looksLikeHeader ? findCol(['tag', 'label', 'category'], 5) : 6;
  const notesIdx = looksLikeHeader ? findCol(['note', 'desc', 'detail'], -1) : -1;
  const docUrlIdx = looksLikeHeader
    ? findCol(['google doc link', 'doc link', 'doc url', 'docurl', 'document url'], -1)
    : 7;
  const docIdIdx = looksLikeHeader ? findCol(['doc id', 'docid', 'document id'], -1) : 8;

  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const tasks: TaskItem[] = dataRows
    .filter((row) => row.some((cell) => cell && cell.trim().length > 0))
    .map((row, idx) => {
      const rawTitle = row[titleIdx] || row[0] || `Task ${idx + 1}`;
      const rawDocUrl = docUrlIdx >= 0 ? (row[docUrlIdx] || '').trim() : '';
      let rawDocId = docIdIdx >= 0 ? (row[docIdIdx] || '').trim() : '';
      if (!rawDocId && rawDocUrl) {
        const match = rawDocUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (match) rawDocId = match[1];
      }
      const docUrl =
        rawDocUrl ||
        (rawDocId ? `https://docs.google.com/document/d/${rawDocId}/edit` : undefined);

      return {
        id: (idIdx >= 0 && row[idIdx]?.trim()) || uid('task'),
        title: rawTitle.trim(),
        status:
          statusIdx >= 0 && row[statusIdx] !== undefined
            ? normalizeStatus(row[statusIdx])
            : VALID_STATUSES[0],
        priority:
          priorityIdx >= 0 && row[priorityIdx] !== undefined
            ? normalizePriority(row[priorityIdx])
            : VALID_PRIORITIES[1],
        assignee: assigneeIdx >= 0 ? (row[assigneeIdx] || '').trim() : '',
        dueDate: dueIdx >= 0 ? (row[dueIdx] || '').trim() : '',
        tags: tagsIdx >= 0 ? (row[tagsIdx] || '').trim() : '',
        notes: notesIdx >= 0 ? (row[notesIdx] || '').trim() : '',
        docId: rawDocId || undefined,
        docUrl,
      };
    });

  return { sheetTitle, sheetTabName: preferredTab, sheetUrl, tasks };
}

export async function syncTasksToSheet(
  token: string,
  spreadsheetId: string,
  sheetTabName: string,
  tasks: TaskItem[]
): Promise<void> {
  const escapedTab = `'${sheetTabName.replace(/'/g, "''")}'`;
  const clearRange = `${escapedTab}!A1:J1000`;

  await workspaceFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(clearRange)}:clear`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );

  const values = [
    TASK_HEADERS,
    ...tasks.map((t) => [
      t.id,
      t.title,
      t.status,
      t.priority,
      t.assignee,
      t.dueDate,
      t.tags,
      t.docUrl || '',
      t.docId || '',
    ]),
  ];

  const writeRange = `${escapedTab}!A1:I${values.length}`;
  await workspaceFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({
        range: writeRange,
        majorDimension: 'ROWS',
        values,
      }),
    }
  );
}

export async function createProjectSpreadsheet(
  token: string,
  title: string,
  folderId: string,
  initialTasks: TaskItem[]
): Promise<{
  spreadsheetId: string;
  sheetTabName: string;
  spreadsheetUrl: string;
}> {
  const created = await workspaceFetch<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  }>('https://sheets.googleapis.com/v4/spreadsheets', token, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Tasks' } }],
    }),
  });

  const tabName = created.sheets?.[0]?.properties?.title || 'Tasks';
  await moveFileToFolder(token, created.spreadsheetId, folderId);
  await syncTasksToSheet(token, created.spreadsheetId, tabName, initialTasks);

  return {
    spreadsheetId: created.spreadsheetId,
    sheetTabName: tabName,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
  };
}

// ============================================================================
// GOOGLE DOCS API
// ============================================================================

interface GoogleDocParagraphElement {
  textRun?: { content?: string };
}

interface GoogleDocStructuralElement {
  startIndex?: number;
  endIndex?: number;
  paragraph?: {
    elements?: GoogleDocParagraphElement[];
    paragraphStyle?: { namedStyleType?: string };
    bullet?: { listId?: string; nestingLevel?: number };
  };
}

interface GoogleDocResource {
  documentId: string;
  title?: string;
  body?: { content?: GoogleDocStructuralElement[] };
  lists?: Record<
    string,
    {
      listProperties?: {
        nestingLevels?: Array<{ glyphType?: string; glyphSymbol?: string }>;
      };
    }
  >;
}

export async function fetchDocBlocks(
  token: string,
  documentId: string
): Promise<{
  docTitle: string;
  docUrl: string;
  blocks: DocBlock[];
}> {
  const doc = await workspaceFetch<GoogleDocResource>(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
    token
  );

  const blocks: DocBlock[] = [];
  const elements = doc.body?.content || [];

  for (const el of elements) {
    if (!el.paragraph) continue;
    const rawText = (el.paragraph.elements || [])
      .map((pe) => pe.textRun?.content || '')
      .join('')
      .replace(/\n$/, '');

    const style = el.paragraph.paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
    const bullet = el.paragraph.bullet;

    if (rawText === '' && blocks.length === 0 && elements.length <= 2) {
      continue;
    }

    if (rawText.trim() === '---') {
      blocks.push({ id: uid('blk'), type: 'divider', content: '' });
      continue;
    }

    if (rawText.startsWith('📄 ')) {
      const rest = rawText.slice(2).trim();
      const match = rest.match(/^(.*?)\s*\[([A-Za-z0-9_-]{10,})\]$/);
      const pageTitle = (match ? match[1] : rest).trim() || 'Untitled Sub-page';
      const pageDocId = match ? match[2] : undefined;
      blocks.push({
        id: uid('blk'),
        type: 'page',
        content: pageTitle,
        docId: pageDocId,
        docUrl: pageDocId
          ? `https://docs.google.com/document/d/${pageDocId}/edit`
          : undefined,
      });
    } else if (style === 'HEADING_1') {
      blocks.push({ id: uid('blk'), type: 'h1', content: rawText });
    } else if (style === 'HEADING_2') {
      blocks.push({ id: uid('blk'), type: 'h2', content: rawText });
    } else if (style === 'HEADING_3') {
      blocks.push({ id: uid('blk'), type: 'h3', content: rawText });
    } else if (rawText.startsWith('☑ ') || rawText.startsWith('[x] ')) {
      blocks.push({
        id: uid('blk'),
        type: 'todo',
        checked: true,
        content: rawText.replace(/^(☑ |\[x\] )/, ''),
      });
    } else if (rawText.startsWith('☐ ') || rawText.startsWith('[ ] ')) {
      blocks.push({
        id: uid('blk'),
        type: 'todo',
        checked: false,
        content: rawText.replace(/^(☐ |\[ \] )/, ''),
      });
    } else if (rawText.startsWith('> ')) {
      blocks.push({
        id: uid('blk'),
        type: 'quote',
        content: rawText.slice(2),
      });
    } else if (rawText.startsWith('Note: ')) {
      blocks.push({
        id: uid('blk'),
        type: 'callout',
        content: rawText.slice(6),
      });
    } else if (bullet) {
      const listLevel =
        doc.lists?.[bullet.listId || '']?.listProperties?.nestingLevels?.[
          bullet.nestingLevel || 0
        ];
      const glyph = listLevel?.glyphType || '';
      const isNumbered =
        glyph.includes('DECIMAL') || glyph.includes('ALPHA') || glyph.includes('ROMAN');
      blocks.push({
        id: uid('blk'),
        type: isNumbered ? 'numbered' : 'bullet',
        content: rawText,
      });
    } else {
      blocks.push({ id: uid('blk'), type: 'paragraph', content: rawText });
    }
  }

  return {
    docTitle: doc.title || 'Project Brief',
    docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    blocks,
  };
}

function blockToDocText(block: DocBlock): string {
  switch (block.type) {
    case 'divider':
      return '---';
    case 'page':
      return block.docId
        ? `📄 ${block.content || 'Untitled Sub-page'} [${block.docId}]`
        : `📄 ${block.content || 'Untitled Sub-page'}`;
    case 'todo':
      return `${block.checked ? '☑' : '☐'} ${block.content}`;
    case 'quote':
      return `> ${block.content}`;
    case 'callout':
      return `Note: ${block.content}`;
    default:
      return block.content;
  }
}

export async function syncBlocksToDoc(
  token: string,
  documentId: string,
  blocks: DocBlock[]
): Promise<void> {
  const doc = await workspaceFetch<GoogleDocResource>(
    `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}`,
    token
  );

  const content = doc.body?.content || [];
  const docEndIndex = content.length > 0 ? content[content.length - 1].endIndex || 2 : 2;

  const requests: Array<Record<string, unknown>> = [];

  if (docEndIndex > 2) {
    requests.push({
      deleteContentRange: {
        range: {
          startIndex: 1,
          endIndex: docEndIndex - 1,
        },
      },
    });
  }

  const lines = blocks.map(blockToDocText);
  const fullText = lines.join('\n');

  if (fullText.length > 0) {
    requests.push({
      insertText: {
        location: { index: 1 },
        text: fullText,
      },
    });

    let cursor = 1;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const lineText = lines[i];
      const startIndex = cursor;
      const endIndex = cursor + lineText.length + 1;

      const namedStyleType =
        block.type === 'h1'
          ? 'HEADING_1'
          : block.type === 'h2'
          ? 'HEADING_2'
          : block.type === 'h3'
          ? 'HEADING_3'
          : 'NORMAL_TEXT';

      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: { namedStyleType },
          fields: 'namedStyleType',
        },
      });

      if (block.type === 'bullet') {
        requests.push({
          createParagraphBullets: {
            range: { startIndex, endIndex },
            bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
          },
        });
      } else if (block.type === 'numbered') {
        requests.push({
          createParagraphBullets: {
            range: { startIndex, endIndex },
            bulletPreset: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
          },
        });
      }

      cursor += lineText.length + 1;
    }
  }

  if (requests.length > 0) {
    await workspaceFetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ requests }),
      }
    );
  }
}

export function buildTaskDocStarterBlocks(
  task: Pick<TaskItem, 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'notes'>,
  template: TaskDocTemplate = 'blank'
): DocBlock[] {
  const title = task.title.trim() || 'Untitled task';
  const metaParts = [
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    task.assignee ? `Owner: ${task.assignee}` : null,
    task.dueDate ? `Due: ${task.dueDate}` : null,
  ].filter(Boolean);

  if (template === 'blank') {
    return [
      {
        id: uid('blk'),
        type: 'paragraph',
        content: task.notes || '',
      },
    ];
  }

  if (template === 'meeting') {
    return [
      { id: uid('blk'), type: 'h1', content: `${title} — Notes` },
      { id: uid('blk'), type: 'callout', content: metaParts.join(' · ') },
      { id: uid('blk'), type: 'h2', content: 'Context & Attendees' },
      {
        id: uid('blk'),
        type: 'bullet',
        content: task.assignee ? `Lead: ${task.assignee}` : '',
      },
      { id: uid('blk'), type: 'h2', content: 'Discussion & Decisions' },
      {
        id: uid('blk'),
        type: 'paragraph',
        content: task.notes || '',
      },
      { id: uid('blk'), type: 'h2', content: 'Action Items' },
      { id: uid('blk'), type: 'todo', checked: false, content: '' },
    ];
  }

  return [
    { id: uid('blk'), type: 'h1', content: title },
    { id: uid('blk'), type: 'callout', content: metaParts.join(' · ') },
    { id: uid('blk'), type: 'h2', content: 'Overview & Goal' },
    {
      id: uid('blk'),
      type: 'paragraph',
      content: task.notes || '',
    },
    { id: uid('blk'), type: 'h2', content: 'Deliverables & Checklist' },
    { id: uid('blk'), type: 'todo', checked: false, content: '' },
    { id: uid('blk'), type: 'h2', content: 'Working Notes' },
    {
      id: uid('blk'),
      type: 'paragraph',
      content: '',
    },
  ];
}

export async function createProjectDocument(
  token: string,
  title: string,
  folderId: string | null,
  initialBlocks: DocBlock[],
  appProperties?: Record<string, string>
): Promise<{
  documentId: string;
  documentUrl: string;
}> {
  const created = await workspaceFetch<{ documentId: string; title: string }>(
    'https://docs.googleapis.com/v1/documents',
    token,
    {
      method: 'POST',
      body: JSON.stringify({ title }),
    }
  );

  if (folderId) {
    await moveFileToFolder(token, created.documentId, folderId);
  }
  if (appProperties && Object.keys(appProperties).length > 0) {
    await workspaceFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(created.documentId)}`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({ appProperties }),
      }
    );
  }
  await syncBlocksToDoc(token, created.documentId, initialBlocks);

  return {
    documentId: created.documentId,
    documentUrl: `https://docs.google.com/document/d/${created.documentId}/edit`,
  };
}

export function buildStandaloneDocStarterBlocks(
  title: string,
  template: TaskDocTemplate = 'blank'
): DocBlock[] {
  const cleanTitle = title.trim() || 'Untitled Document';
  if (template === 'blank') {
    return [{ id: uid('blk'), type: 'paragraph', content: '' }];
  }
  if (template === 'meeting') {
    return [
      { id: uid('blk'), type: 'h1', content: cleanTitle },
      { id: uid('blk'), type: 'h2', content: 'Agenda' },
      { id: uid('blk'), type: 'bullet', content: '' },
      { id: uid('blk'), type: 'h2', content: 'Key Decisions' },
      { id: uid('blk'), type: 'paragraph', content: '' },
      { id: uid('blk'), type: 'h2', content: 'Action Items' },
      { id: uid('blk'), type: 'todo', checked: false, content: '' },
    ];
  }
  return [
    { id: uid('blk'), type: 'h1', content: cleanTitle },
    { id: uid('blk'), type: 'h2', content: 'Overview' },
    {
      id: uid('blk'),
      type: 'paragraph',
      content: '',
    },
    { id: uid('blk'), type: 'h2', content: 'Checklist' },
    { id: uid('blk'), type: 'todo', checked: false, content: '' },
  ];
}

export async function createStandaloneProjectDocument(
  token: string,
  options: {
    title: string;
    projectFolderId: string | null;
    rootFolderId: string | null;
    blocks: DocBlock[];
    parentDocId?: string | null;
  }
): Promise<ProjectDocPage> {
  const targetFolderId = options.projectFolderId || options.rootFolderId;
  const docTitle = options.title.trim() || 'Untitled Document';
  const appProps: Record<string, string> = { folioExtraDoc: 'true' };
  if (options.parentDocId) {
    appProps.folioParentDocId = options.parentDocId;
  }
  const created = await createProjectDocument(
    token,
    docTitle,
    targetFolderId,
    options.blocks,
    appProps
  );

  return {
    id: created.documentId,
    title: docTitle,
    url: created.documentUrl,
    parentDocId: options.parentDocId || null,
    blocks: options.blocks,
    dirty: false,
    modifiedTime: new Date().toISOString(),
  };
}

export async function createTaskDocument(
  token: string,
  options: {
    title: string;
    projectFolderId: string | null;
    rootFolderId: string | null;
    taskId: string;
    blocks: DocBlock[];
  }
): Promise<{
  documentId: string;
  documentUrl: string;
  docTitle: string;
}> {
  const parentBase = options.projectFolderId || options.rootFolderId;
  const targetFolderId = parentBase
    ? await findOrCreateTaskDocsFolder(token, parentBase)
    : null;

  const docTitle = options.title.trim() || 'Untitled Task Document';
  const created = await createProjectDocument(
    token,
    docTitle,
    targetFolderId,
    options.blocks,
    {
      folioTaskDoc: 'true',
      folioTaskId: options.taskId,
    }
  );

  return {
    documentId: created.documentId,
    documentUrl: created.documentUrl,
    docTitle,
  };
}

export async function createStandaloneWorkspacePage(
  token: string,
  options: {
    title: string;
    icon?: string;
    rootFolderId: string | null;
    blocks: DocBlock[];
    parentDocId?: string | null;
  }
): Promise<StandalonePage> {
  const docTitle = options.title.trim() || 'Untitled Page';
  const appProps: Record<string, string> = {
    folioStandalonePage: 'true',
    folioIcon: options.icon || '📄',
  };
  if (options.parentDocId) {
    appProps.folioParentDocId = options.parentDocId;
  }

  const created = await createProjectDocument(
    token,
    docTitle,
    options.rootFolderId,
    options.blocks,
    appProps
  );

  return {
    id: created.documentId,
    title: docTitle,
    icon: options.icon || '📄',
    coverUrl: null,
    docUrl: created.documentUrl,
    parentDocId: options.parentDocId || null,
    blocks: options.blocks,
    dirty: false,
    lastSyncedAt: new Date().toISOString(),
    modifiedTime: new Date().toISOString(),
  };
}

export async function discoverStandaloneWorkspacePages(
  token: string,
  rootFolderId: string
): Promise<StandalonePage[]> {
  const children = await listFolderFiles(token, rootFolderId);
  const docFiles = children.filter(
    (f) => f.mimeType === 'application/vnd.google-apps.document'
  );

  const pages: StandalonePage[] = [];
  for (let i = 0; i < docFiles.length; i++) {
    const file = docFiles[i];
    let blocks: DocBlock[] = [];
    let docTitle = file.name;
    let docUrl =
      file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;

    try {
      const docData = await fetchDocBlocks(token, file.id);
      blocks = docData.blocks;
      docTitle = docData.docTitle;
      docUrl = docData.docUrl;
    } catch (err) {
      console.warn(`Could not load standalone page ${file.id}`, err);
    }

    pages.push({
      id: file.id,
      title: docTitle,
      icon: file.appProperties?.folioIcon || ['📄', '📝', '📌', '💡', '📑'][i % 5],
      coverUrl: null,
      docUrl,
      parentDocId: file.appProperties?.folioParentDocId || null,
      blocks:
        blocks.length > 0
          ? blocks
          : [{ id: uid('blk'), type: 'paragraph', content: '' }],
      dirty: false,
      lastSyncedAt: new Date().toISOString(),
      modifiedTime: file.modifiedTime,
    });
  }

  return pages;
}

// ============================================================================
// UNIFIED PROJECT DISCOVERY & CREATION
// ============================================================================

export async function discoverWorkspaceProjects(
  token: string,
  rootFolderId: string
): Promise<ProjectWorkspace[]> {
  const children = await listFolderFiles(token, rootFolderId);
  const projectFolders = children.filter(
    (f) =>
      f.mimeType === 'application/vnd.google-apps.folder' &&
      f.name !== TASK_DOCS_FOLDER_NAME &&
      f.appProperties?.folioTaskDocsFolder !== 'true'
  );

  const projects: ProjectWorkspace[] = [];

  for (let i = 0; i < projectFolders.length; i++) {
    const folder = projectFolders[i];
    const files = await listFolderFiles(token, folder.id);
    const sheetFile = files.find(
      (f) => f.mimeType === 'application/vnd.google-apps.spreadsheet'
    );
    const candidateDocs = files.filter(
      (f) =>
        f.mimeType === 'application/vnd.google-apps.document' &&
        f.appProperties?.folioTaskDoc !== 'true'
    );
    const docFile =
      candidateDocs.find(
        (f) =>
          f.appProperties?.folioProjectBrief === 'true' ||
          f.name.endsWith('— Brief')
      ) || candidateDocs[0];

    const extraDocs: ProjectDocPage[] = candidateDocs
      .filter((f) => f.id !== docFile?.id)
      .map((f) => ({
        id: f.id,
        title: f.name,
        url: f.webViewLink || `https://docs.google.com/document/d/${f.id}/edit`,
        parentDocId: f.appProperties?.folioParentDocId || null,
        modifiedTime: f.modifiedTime,
        dirty: false,
      }));

    let tasks: TaskItem[] = [];
    let sheetTabName: string | null = null;
    let sheetTitle: string | null = sheetFile?.name || null;
    let sheetUrl: string | null = sheetFile?.webViewLink || null;

    if (sheetFile) {
      try {
        const sheetData = await fetchSheetTasks(token, sheetFile.id);
        tasks = sheetData.tasks;
        sheetTabName = sheetData.sheetTabName;
        sheetTitle = sheetData.sheetTitle;
        sheetUrl = sheetData.sheetUrl;
      } catch (err) {
        console.warn(`Could not load sheet ${sheetFile.id}`, err);
      }
    }

    let blocks: DocBlock[] = [];
    let docTitle: string | null = docFile?.name || null;
    let docUrl: string | null = docFile?.webViewLink || null;

    if (docFile) {
      try {
        const docData = await fetchDocBlocks(token, docFile.id);
        blocks = docData.blocks;
        docTitle = docData.docTitle;
        docUrl = docData.docUrl;
      } catch (err) {
        console.warn(`Could not load doc ${docFile.id}`, err);
      }
    }

    const preset = getCoverPresetByIndex(i);
    projects.push({
      id: folder.id,
      title: folder.name,
      icon: ['📋', '📐', '🗂️', '🧭', '📦', '✨'][i % 6],
      coverUrl: preset.url,
      driveFolderId: folder.id,
      driveFolderName: folder.name,
      driveFolderUrl:
        folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
      sheetId: sheetFile?.id || null,
      sheetTitle,
      sheetTabName,
      sheetUrl,
      docId: docFile?.id || null,
      docTitle,
      docUrl,
      blocks:
        blocks.length > 0
          ? blocks
          : [{ id: uid('blk'), type: 'paragraph', content: '' }],
      extraDocs,
      tasks,
      driveFiles: files,
      lastSyncedAt: new Date().toISOString(),
      dirtyDoc: false,
      dirtyTasks: false,
    });
  }

  return projects;
}

export async function createFullWorkspaceProject(
  token: string,
  rootFolderId: string,
  title: string,
  icon: string,
  coverIndex: number
): Promise<ProjectWorkspace> {
  const folder = await createDriveFolder(token, title, rootFolderId);

  const starterBlocks: DocBlock[] = [
    { id: uid('blk'), type: 'paragraph', content: '' },
  ];

  const starterTasks: TaskItem[] = [];

  const [sheetInfo, docInfo] = await Promise.all([
    createProjectSpreadsheet(token, `${title} — Tasks`, folder.id, starterTasks),
    createProjectDocument(token, `${title} — Brief`, folder.id, starterBlocks, {
      folioProjectBrief: 'true',
    }),
  ]);

  const files = await listFolderFiles(token, folder.id);
  const preset = getCoverPresetByIndex(coverIndex);

  return {
    id: folder.id,
    title,
    icon,
    coverUrl: preset.url,
    driveFolderId: folder.id,
    driveFolderName: folder.name,
    driveFolderUrl:
      folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    sheetId: sheetInfo.spreadsheetId,
    sheetTitle: `${title} — Tasks`,
    sheetTabName: sheetInfo.sheetTabName,
    sheetUrl: sheetInfo.spreadsheetUrl,
    docId: docInfo.documentId,
    docTitle: `${title} — Brief`,
    docUrl: docInfo.documentUrl,
    blocks: starterBlocks,
    extraDocs: [],
    tasks: starterTasks,
    driveFiles: files,
    lastSyncedAt: new Date().toISOString(),
    dirtyDoc: false,
    dirtyTasks: false,
  };
}
