import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FolderTree,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { DocBlock, ProjectWorkspace, TaskDocTemplate } from '../types/workspace';
import { buildStandaloneDocStarterBlocks, uid } from '../lib/googleWorkspaceApi';

export type OrganizedDocTemplate = TaskDocTemplate | 'guideline';

interface DriveGuidelinePanelProps {
  isGuestMode?: boolean;
  projects?: ProjectWorkspace[];
  defaultProjectId?: string | null;
  compact?: boolean;
  onCreateOrganizedDocument?: (options: {
    title: string;
    destination: 'standalone' | 'project';
    projectId?: string;
    blocks: DocBlock[];
  }) => void;
}

export function buildDriveGuidelineDocBlocks(customTitle?: string): DocBlock[] {
  return [
    {
      id: uid('blk'),
      type: 'h1',
      content: customTitle?.trim() || 'Folio — Google Drive Editing & Organization Guide',
    },
    {
      id: uid('blk'),
      type: 'callout',
      content:
        'Note: Keep this guide in your Folio Workspace folder. Follow these conventions whenever you create or edit Google Docs, Google Sheets, or folders directly in Google Drive so Folio organizes them automatically.',
    },
    {
      id: uid('blk'),
      type: 'h2',
      content: '1. Folder & File Hierarchy in Google Drive',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Folio Workspace (Root Folder): All workspace items live inside this root folder in your Google Drive.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Standalone Pages: Any Google Doc placed directly in "Folio Workspace" automatically appears under Standalone Pages in the sidebar.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Projects: Any Folder created inside "Folio Workspace" becomes a Project in Folio.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Project Brief (Main Page): Name the primary Google Doc inside a project folder "<Project Name> — Brief" to map it to the main Page tab.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Additional Project Docs: Any other Google Doc placed inside a project folder automatically appears in that project’s Documents tab.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Task Docs Subfolder: A subfolder named "Task Docs" inside a project folder holds individual Google Docs linked to specific task rows.',
    },
    {
      id: uid('blk'),
      type: 'divider',
      content: '',
    },
    {
      id: uid('blk'),
      type: 'h2',
      content: '2. Editing Google Docs Directly (Block Formatting Syntax)',
    },
    {
      id: uid('blk'),
      type: 'paragraph',
      content:
        'When you edit a linked Google Doc directly in Google Docs and click Pull / Refresh in Folio, paragraphs are converted into blocks using these rules:',
    },
    {
      id: uid('blk'),
      type: 'todo',
      checked: false,
      content: 'Start a line with "☐ " or "[ ] " for an unchecked To-do item',
    },
    {
      id: uid('blk'),
      type: 'todo',
      checked: true,
      content: 'Start a line with "☑ " or "[x] " for a completed To-do item',
    },
    {
      id: uid('blk'),
      type: 'quote',
      content: 'Start a line with "> " to format it as a Quote block in Folio.',
    },
    {
      id: uid('blk'),
      type: 'callout',
      content: 'Start a line with "Note: " to format it as a Callout block in Folio.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content:
        'Use native Google Docs Heading 1, Heading 2, Heading 3, Bulleted Lists, and Numbered Lists—or type "---" on its own line for a Divider.',
    },
    {
      id: uid('blk'),
      type: 'divider',
      content: '',
    },
    {
      id: uid('blk'),
      type: 'h2',
      content: '3. Editing Google Sheets Directly (Task Board Columns)',
    },
    {
      id: uid('blk'),
      type: 'paragraph',
      content:
        'Place a Google Sheet inside a project folder (tab named "Tasks") with these Row 1 headers: ID | Title | Status | Priority | Assignee | Due Date | Tags | Google Doc Link | Doc ID.',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content: 'Valid Statuses: Backlog, In Progress, In Review, Done',
    },
    {
      id: uid('blk'),
      type: 'bullet',
      content: 'Valid Priorities: Low, Medium, High, Urgent',
    },
  ];
}

const DOC_SYNTAX_TEMPLATE = `Project / Document Title (Format as Heading 1)

Note: Start a paragraph with "Note: " to create a highlighted Callout block in Folio.

Overview & Context (Format as Heading 2)
Write regular paragraphs naturally. Use native Google Docs Bulleted Lists or Numbered Lists for list items.

> Start a line with "> " to create a Quote block.

Action Checklist (Format as Heading 2)
[ ] Unchecked to-do item (use "[ ] " or "☐ ")
[x] Completed to-do item (use "[x] " or "☑ ")

---`;

const SHEET_TSV_HEADERS =
  'ID\tTitle\tStatus\tPriority\tAssignee\tDue Date\tTags\tGoogle Doc Link\tDoc ID';

export const DriveGuidelinePanel: React.FC<DriveGuidelinePanelProps> = ({
  isGuestMode = false,
  projects = [],
  defaultProjectId = null,
  compact = false,
  onCreateOrganizedDocument,
}) => {
  const [isOpen, setIsOpen] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'docs' | 'sheets' | 'create'>(
    'hierarchy'
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [docTitle, setDocTitle] = useState('');
  const [destination, setDestination] = useState<'standalone' | 'project'>(
    defaultProjectId ? 'project' : 'standalone'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId || projects[0]?.id || ''
  );
  const [template, setTemplate] = useState<OrganizedDocTemplate>('blank');

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2200);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateOrganizedDocument) return;
    const cleanTitle =
      docTitle.trim() ||
      (template === 'guideline'
        ? 'Folio — Google Drive Editing & Organization Guide'
        : 'Untitled Document');

    const blocks =
      template === 'guideline'
        ? buildDriveGuidelineDocBlocks(cleanTitle)
        : buildStandaloneDocStarterBlocks(cleanTitle, template);

    onCreateOrganizedDocument({
      title: cleanTitle,
      destination,
      projectId: destination === 'project' ? selectedProjectId || projects[0]?.id : undefined,
      blocks,
    });
    setDocTitle('');
  };

  const handleQuickCreateGuideDoc = () => {
    if (!onCreateOrganizedDocument) return;
    const guideTitle = 'Folio — Google Drive Editing & Organization Guide';
    onCreateOrganizedDocument({
      title: guideTitle,
      destination: defaultProjectId ? 'project' : 'standalone',
      projectId: defaultProjectId || undefined,
      blocks: buildDriveGuidelineDocBlocks(guideTitle),
    });
  };

  return (
    <div className="rounded-xl border border-neutral-200/90 bg-[#F8F8F7] dark:border-neutral-800 dark:bg-[#20201E]">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200/80 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-display text-xs font-semibold text-neutral-900 dark:text-neutral-100 sm:text-sm">
            Drive Organization Guide
          </span>
        </button>

        <div className="flex items-center gap-2">
          {onCreateOrganizedDocument && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setActiveTab('create');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Create Doc</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-expanded={isOpen}
          >
            <span>{isOpen ? 'Hide' : 'Guide'}</span>
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Guideline Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-neutral-200/80 bg-white dark:border-neutral-800 dark:bg-[#191918]"
          >
            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 bg-[#F8F8F7]/60 px-4 py-2 dark:border-neutral-800 dark:bg-[#20201E]/60">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('hierarchy')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'hierarchy'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <FolderTree className="h-3.5 w-3.5" />
                  <span>1. Folder & File Organization</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('docs')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'docs'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>2. Editing Google Docs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sheets')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === 'sheets'
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>3. Editing Google Sheets</span>
                </button>
                {onCreateOrganizedDocument && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === 'create'
                        ? 'bg-blue-600 text-white'
                        : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>4. Create & Auto-Organize Doc</span>
                  </button>
                )}
              </div>

              {onCreateOrganizedDocument && (
                <button
                  type="button"
                  onClick={handleQuickCreateGuideDoc}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  title="Creates a Google Doc containing this full guideline inside your workspace"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  <span>
                    {isGuestMode
                      ? 'Save Guide as Local Page'
                      : 'Save Guide Doc in Google Drive'}
                  </span>
                </button>
              )}
            </div>

            {/* Tab 1: Folder & File Organization */}
            {activeTab === 'hierarchy' && (
              <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-12">
                <div className="space-y-2.5 lg:col-span-5">
                  <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Drive Directory Blueprint
                  </h4>
                  <div className="rounded-lg border border-neutral-200 bg-[#F8F8F7] p-3.5 font-mono text-xs leading-relaxed text-neutral-800 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-200">
                    <div className="font-semibold text-amber-700 dark:text-amber-400">
                      📁 Folio Workspace/ <span className="font-normal text-neutral-400">(Root)</span>
                    </div>
                    <div className="ml-4 mt-1 text-blue-700 dark:text-blue-400">
                      ├─ 📄 Any Google Doc <span className="text-neutral-400">→ Standalone Page</span>
                    </div>
                    <div className="ml-4 mt-1 font-semibold text-amber-700 dark:text-amber-400">
                      └─ 📁 &lt;Project Name&gt;/ <span className="font-normal text-neutral-400">→ Project</span>
                    </div>
                    <div className="ml-9 mt-1 text-blue-700 dark:text-blue-400">
                      ├─ 📄 &lt;Project&gt; — Brief <span className="text-neutral-400">→ Main Page</span>
                    </div>
                    <div className="ml-9 mt-1 text-emerald-700 dark:text-emerald-400">
                      ├─ 📊 &lt;Project&gt; — Tasks <span className="text-neutral-400">→ Task Board</span>
                    </div>
                    <div className="ml-9 mt-1 text-blue-700 dark:text-blue-400">
                      ├─ 📄 Any Extra Doc <span className="text-neutral-400">→ Project Docs Tab</span>
                    </div>
                    <div className="ml-9 mt-1 text-amber-700 dark:text-amber-400">
                      └─ 📁 Task Docs/ <span className="text-neutral-400">→ Per-Task Specs</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 lg:col-span-7">
                  <h4 className="font-display text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Where to Create or Move Files in Google Drive
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-lg border border-neutral-200/80 p-3 dark:border-neutral-800">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Want a Standalone Page?
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        Create or move any <strong>Google Doc</strong> directly into the root{' '}
                        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] dark:bg-neutral-800">
                          Folio Workspace
                        </code>{' '}
                        folder. Click <strong>Refresh</strong> and it appears under{' '}
                        <strong>Standalone Pages</strong>.
                      </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200/80 p-3 dark:border-neutral-800">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Want a New Project?
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        Create a <strong>Folder</strong> inside{' '}
                        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] dark:bg-neutral-800">
                          Folio Workspace
                        </code>{' '}
                        (or click <strong>Open in Folio</strong> on any folder below). Its name becomes
                        the Project title.
                      </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200/80 p-3 dark:border-neutral-800">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Want to Add a Doc to a Project?
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        Create a Google Doc inside that Project&rsquo;s Drive folder. Name it ending
                        with{' '}
                        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px] dark:bg-neutral-800">
                          — Brief
                        </code>{' '}
                        for the main Page, or any other title to organize it under the{' '}
                        <strong>Documents</strong> tab.
                      </p>
                    </div>

                    <div className="rounded-lg border border-neutral-200/80 p-3 dark:border-neutral-800">
                      <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        Editing in Google Drive vs. Folio
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                        After editing a Doc or Sheet directly inside Google Workspace, click{' '}
                        <strong>Pull from Drive</strong> (or enable <strong>Auto-Sync</strong>) so
                        Folio imports your latest edits cleanly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Editing Google Docs (Block Formatting Syntax) */}
            {activeTab === 'docs' && (
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Google Docs → Folio Notion-Style Block Mapping
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Use these prefixes or native Google Docs paragraph styles when editing directly in Google Docs:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('doc-template', DOC_SYNTAX_TEMPLATE)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {copiedKey === 'doc-template' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied Doc Template!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Starter Template for Google Docs</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-neutral-200/80 bg-[#F8F8F7]/60 p-2.5 text-xs dark:border-neutral-800 dark:bg-[#20201E]/60">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Headings (H1 / H2 / H3)
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      Apply Google Docs native{' '}
                      <code className="font-mono text-blue-600 dark:text-blue-400">Heading 1</code>,{' '}
                      <code className="font-mono text-blue-600 dark:text-blue-400">Heading 2</code>, or{' '}
                      <code className="font-mono text-blue-600 dark:text-blue-400">Heading 3</code>.
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200/80 bg-[#F8F8F7]/60 p-2.5 text-xs dark:border-neutral-800 dark:bg-[#20201E]/60">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      To-do Checklists
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      Prefix line with{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        [ ]{' '}
                      </code>{' '}
                      or{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        ☐{' '}
                      </code>{' '}
                      (unchecked) and{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        [x]{' '}
                      </code>{' '}
                      or{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        ☑{' '}
                      </code>{' '}
                      (checked).
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200/80 bg-[#F8F8F7]/60 p-2.5 text-xs dark:border-neutral-800 dark:bg-[#20201E]/60">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Callouts & Quotes
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      Start line with{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        Note:{' '}
                      </code>{' '}
                      for a Callout box, or{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        &gt;{' '}
                      </code>{' '}
                      for a Quote block.
                    </p>
                  </div>

                  <div className="rounded-lg border border-neutral-200/80 bg-[#F8F8F7]/60 p-2.5 text-xs dark:border-neutral-800 dark:bg-[#20201E]/60">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Lists, Dividers & Sub-pages
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                      Use native Bulleted/Numbered lists, type{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        ---
                      </code>{' '}
                      for a Divider, or{' '}
                      <code className="rounded bg-white px-1 font-mono dark:bg-neutral-800">
                        📄 Title [DocID]
                      </code>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Editing Google Sheets (Task Columns) */}
            {activeTab === 'sheets' && (
              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Google Sheets → Kanban & Task Table Column Schema
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Name your sheet tab <strong>Tasks</strong> (or use the first tab) with these exact Row 1 column headers:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('sheet-headers', SHEET_TSV_HEADERS)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    {copiedKey === 'sheet-headers' ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied! Paste into Cell A1</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Row 1 Headers (A1:I1)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <table className="w-full border-collapse text-left font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-[#F8F8F7] text-neutral-600 dark:border-neutral-800 dark:bg-[#20201E] dark:text-neutral-300">
                        <th className="px-2.5 py-1.5">A: ID</th>
                        <th className="px-2.5 py-1.5">B: Title</th>
                        <th className="px-2.5 py-1.5">C: Status</th>
                        <th className="px-2.5 py-1.5">D: Priority</th>
                        <th className="px-2.5 py-1.5">E: Assignee</th>
                        <th className="px-2.5 py-1.5">F: Due Date</th>
                        <th className="px-2.5 py-1.5">G: Tags</th>
                        <th className="px-2.5 py-1.5">H: Google Doc Link</th>
                        <th className="px-2.5 py-1.5">I: Doc ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white text-neutral-600 dark:bg-[#191918] dark:text-neutral-400">
                        <td className="px-2.5 py-2">task_01</td>
                        <td className="px-2.5 py-2 font-sans font-medium text-neutral-900 dark:text-neutral-100">
                          Launch Specification
                        </td>
                        <td className="px-2.5 py-2 text-blue-600 dark:text-blue-400">
                          Backlog | In Progress | In Review | Done
                        </td>
                        <td className="px-2.5 py-2 text-amber-700 dark:text-amber-400">
                          Low | Medium | High | Urgent
                        </td>
                        <td className="px-2.5 py-2">Alex</td>
                        <td className="px-2.5 py-2">2026-11-30</td>
                        <td className="px-2.5 py-2">Product</td>
                        <td className="px-2.5 py-2 text-neutral-400">https://docs.google...</td>
                        <td className="px-2.5 py-2 text-neutral-400">1AbC...</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Create & Auto-Organize Document */}
            {activeTab === 'create' && onCreateOrganizedDocument && (
              <form onSubmit={handleCreateSubmit} className="space-y-3.5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      Create & Auto-Organize a New Google Doc
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Folio will automatically place the document in the proper Google Drive folder, format its headings & blocks, and organize it in your sidebar.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Document Title
                    </label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder={
                        template === 'guideline'
                          ? 'Folio — Google Drive Editing & Organization Guide'
                          : 'e.g. Q4 Product Strategy...'
                      }
                      className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Where Should Folio Organize It?
                    </label>
                    <select
                      value={
                        destination === 'standalone'
                          ? '__standalone__'
                          : selectedProjectId || projects[0]?.id || '__standalone__'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__standalone__') {
                          setDestination('standalone');
                        } else {
                          setDestination('project');
                          setSelectedProjectId(val);
                        }
                      }}
                      className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100"
                    >
                      <option value="__standalone__">
                        📄 Standalone Page (Root: Folio Workspace/)
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          📁 Project Folder: {p.icon} {p.title} (Documents Tab)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                      Pre-Organized Block Template
                    </label>
                    <select
                      value={template}
                      onChange={(e) => setTemplate(e.target.value as OrganizedDocTemplate)}
                      className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-2.5 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#20201E] dark:text-neutral-100"
                    >
                      <option value="spec">Specification & Action Checklist</option>
                      <option value="meeting">Meeting Notes & Decisions</option>
                      <option value="guideline">Full Drive Editing & Syntax Reference Guide</option>
                      <option value="blank">Clean Blank Document (H1 + Paragraph)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span>
                      {destination === 'standalone'
                        ? 'Will be saved in "Folio Workspace" root folder and listed under Standalone Pages.'
                        : `Will be saved inside the selected Project folder and listed in its Documents tab.`}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <FilePlus2 className="h-3.5 w-3.5" />
                    <span>
                      {isGuestMode
                        ? 'Create & Organize Locally'
                        : 'Create & Organize in Google Drive'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
