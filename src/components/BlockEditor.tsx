import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  FilePlus2,
  FileText,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Info,
  List,
  ListOrdered,
  Minus,
  Plus,
  Quote,
  SquareCheck,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { DocBlock, DocBlockType } from '../types/workspace';
import { uid } from '../lib/googleWorkspaceApi';

interface BlockEditorProps {
  blocks: DocBlock[];
  onChange: (nextBlocks: DocBlock[]) => void;
  compact?: boolean;
  onCreateSubPage?: (title: string, replaceBlockId?: string) => void;
  onOpenPageDoc?: (docId: string) => void;
}

interface BlockTypeOption {
  type: DocBlockType;
  label: string;
  shortLabel: string;
  shortcut: string;
  hint: string;
  icon: React.ReactNode;
}

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    type: 'paragraph',
    label: 'Text',
    shortLabel: 'Text',
    shortcut: '⌘⌥0',
    hint: 'Plain paragraph text',
    icon: <Type className="h-3.5 w-3.5" />,
  },
  {
    type: 'h1',
    label: 'Heading 1',
    shortLabel: 'H1',
    shortcut: '#',
    hint: 'Type # + space',
    icon: <Heading1 className="h-3.5 w-3.5" />,
  },
  {
    type: 'h2',
    label: 'Heading 2',
    shortLabel: 'H2',
    shortcut: '##',
    hint: 'Type ## + space',
    icon: <Heading2 className="h-3.5 w-3.5" />,
  },
  {
    type: 'h3',
    label: 'Heading 3',
    shortLabel: 'H3',
    shortcut: '###',
    hint: 'Type ### + space',
    icon: <Heading3 className="h-3.5 w-3.5" />,
  },
  {
    type: 'todo',
    label: 'To-do list',
    shortLabel: 'To-do',
    shortcut: '[]',
    hint: 'Type [] + space',
    icon: <SquareCheck className="h-3.5 w-3.5" />,
  },
  {
    type: 'bullet',
    label: 'Bulleted list',
    shortLabel: 'Bullet',
    shortcut: '-',
    hint: 'Type - + space',
    icon: <List className="h-3.5 w-3.5" />,
  },
  {
    type: 'numbered',
    label: 'Numbered list',
    shortLabel: '1. List',
    shortcut: '1.',
    hint: 'Type 1. + space',
    icon: <ListOrdered className="h-3.5 w-3.5" />,
  },
  {
    type: 'quote',
    label: 'Quote',
    shortLabel: 'Quote',
    shortcut: '>',
    hint: 'Type > + space',
    icon: <Quote className="h-3.5 w-3.5" />,
  },
  {
    type: 'callout',
    label: 'Callout',
    shortLabel: 'Callout',
    shortcut: '!',
    hint: 'Type ! + space',
    icon: <Info className="h-3.5 w-3.5" />,
  },
  {
    type: 'code',
    label: 'Code block',
    shortLabel: 'Code',
    shortcut: '```',
    hint: 'Type ``` + space',
    icon: <Code2 className="h-3.5 w-3.5" />,
  },
  {
    type: 'divider',
    label: 'Divider',
    shortLabel: 'Divider',
    shortcut: '---',
    hint: 'Type ---',
    icon: <Minus className="h-3.5 w-3.5" />,
  },
  {
    type: 'page',
    label: 'Page (Sub-document)',
    shortLabel: 'Page',
    shortcut: '/page',
    hint: 'Nested Google Doc inside this page',
    icon: <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
  },
];

export const BlockEditor: React.FC<BlockEditorProps> = ({
  blocks,
  onChange,
  compact = false,
  onCreateSubPage,
  onOpenPageDoc,
}) => {
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);
  const [turnIntoOpen, setTurnIntoOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    blocks[0]?.id || null
  );
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [subPagePrompt, setSubPagePrompt] = useState<{
    title: string;
    replaceBlockId?: string;
  } | null>(null);
  const inputRefs = useRef<
    Record<string, HTMLTextAreaElement | HTMLInputElement | null>
  >({});

  useEffect(() => {
    if (focusBlockId && inputRefs.current[focusBlockId]) {
      const el = inputRefs.current[focusBlockId];
      el?.focus();
      setActiveBlockId(focusBlockId);
      setFocusBlockId(null);
    }
  }, [focusBlockId, blocks]);

  useEffect(() => {
    if (!activeBlockId || !blocks.some((b) => b.id === activeBlockId)) {
      setActiveBlockId(blocks[0]?.id || null);
    }
  }, [blocks, activeBlockId]);

  // Close block action menu when clicking outside
  useEffect(() => {
    if (!menuBlockId) return;
    const handleOutsideClick = () => {
      setMenuBlockId(null);
      setTurnIntoOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [menuBlockId]);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const availableOptions = BLOCK_TYPE_OPTIONS.filter(
    (opt) => opt.type !== 'page' || Boolean(onCreateSubPage)
  );

  const filteredSlashOptions = availableOptions.filter((opt) => {
    const q = slashFilter.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.shortLabel.toLowerCase().includes(q) ||
      opt.type.toLowerCase().includes(q) ||
      opt.shortcut.toLowerCase().includes(q)
    );
  });

  const updateBlock = (id: string, patch: Partial<DocBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const addBlockAfter = (
    afterId: string,
    type: DocBlockType = 'paragraph',
    openSlash = false
  ) => {
    const idx = blocks.findIndex((b) => b.id === afterId);
    const nextBlock: DocBlock = {
      id: uid('blk'),
      type,
      content: openSlash ? '/' : '',
      checked: type === 'todo' ? false : undefined,
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, nextBlock);
    onChange(next);
    setFocusBlockId(nextBlock.id);
    if (openSlash) {
      setSlashBlockId(nextBlock.id);
      setSlashFilter('');
      setSlashIndex(0);
    }
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const source = blocks[idx];
    const copy: DocBlock = {
      ...source,
      id: uid('blk'),
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onChange(next);
    setFocusBlockId(copy.id);
    setMenuBlockId(null);
  };

  const removeBlock = (id: string) => {
    setMenuBlockId(null);
    if (blocks.length <= 1) {
      const resetId = blocks[0]?.id || uid('blk');
      onChange([{ id: resetId, type: 'paragraph', content: '' }]);
      setActiveBlockId(resetId);
      return;
    }
    const idx = blocks.findIndex((b) => b.id === id);
    const prevBlock = blocks[idx - 1] || blocks[idx + 1];
    onChange(blocks.filter((b) => b.id !== id));
    if (prevBlock) {
      setFocusBlockId(prevBlock.id);
    }
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    onChange(next);
    setFocusBlockId(id);
    setMenuBlockId(null);
  };

  const handleDropReorder = (targetId: string) => {
    if (!draggedBlockId || draggedBlockId === targetId) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }
    const fromIdx = blocks.findIndex((b) => b.id === draggedBlockId);
    const toIdx = blocks.findIndex((b) => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedBlockId(null);
      setDragOverBlockId(null);
      return;
    }
    const next = [...blocks];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onChange(next);
    setDraggedBlockId(null);
    setDragOverBlockId(null);
  };

  const convertBlockType = (
    blockId: string,
    type: DocBlockType,
    cleanSlash = false
  ) => {
    const current = blocks.find((b) => b.id === blockId);
    if (!current) return;
    const content = cleanSlash
      ? current.content.replace(/\/[^\s]*$/, '').trimStart()
      : current.content;

    if (type === 'page') {
      setSlashBlockId(null);
      setSlashFilter('');
      setMenuBlockId(null);
      setTurnIntoOpen(false);
      if (onCreateSubPage) {
        if (cleanSlash) {
          updateBlock(blockId, { content });
        }
        setSubPagePrompt({
          title: content.trim(),
          replaceBlockId: cleanSlash && !content.trim() ? blockId : undefined,
        });
      }
      return;
    }

    if (type === 'divider') {
      updateBlock(blockId, { type: 'divider', content: '' });
      setSlashBlockId(null);
      setSlashFilter('');
      setMenuBlockId(null);
      setTurnIntoOpen(false);
      addBlockAfter(blockId, 'paragraph');
      return;
    }

    updateBlock(blockId, {
      type,
      content,
      checked: type === 'todo' ? current.checked ?? false : undefined,
    });
    setSlashBlockId(null);
    setSlashFilter('');
    setMenuBlockId(null);
    setTurnIntoOpen(false);
    setFocusBlockId(blockId);
  };

  const handlePlusClick = (block: DocBlock) => {
    // Notion behavior: if current block is an empty paragraph, open slash menu right here; otherwise insert block below & open slash menu
    if (block.type === 'paragraph' && block.content.trim() === '') {
      updateBlock(block.id, { content: '/' });
      setSlashBlockId(block.id);
      setSlashFilter('');
      setSlashIndex(0);
      setFocusBlockId(block.id);
    } else {
      addBlockAfter(block.id, 'paragraph', true);
    }
  };

  const handleContentChange = (block: DocBlock, val: string) => {
    // Notion live Markdown shortcuts at start of block
    const prefixShortcuts: Array<[RegExp, DocBlockType, boolean?]> = [
      [/^# (.*)$/, 'h1'],
      [/^## (.*)$/, 'h2'],
      [/^### (.*)$/, 'h3'],
      [/^[-*+] (.*)$/, 'bullet'],
      [/^1\. (.*)$/, 'numbered'],
      [/^\[\] (.*)$/, 'todo', false],
      [/^\[ \] (.*)$/, 'todo', false],
      [/^\[x\] (.*)$/i, 'todo', true],
      [/^> (.*)$/, 'quote'],
      [/^" (.*)$/, 'quote'],
      [/^! (.*)$/, 'callout'],
      [/^``` ?(.*)$/, 'code'],
    ];

    for (const [pattern, targetType, checkedState] of prefixShortcuts) {
      const match = val.match(pattern);
      if (match && (block.type === 'paragraph' || block.type !== targetType)) {
        updateBlock(block.id, {
          type: targetType,
          content: match[1] || '',
          checked:
            targetType === 'todo'
              ? checkedState ?? false
              : undefined,
        });
        setSlashBlockId(null);
        setSlashFilter('');
        return;
      }
    }

    // Notion divider shortcut: typing --- or *** at start of line
    if ((val === '---' || val === '***') && block.type === 'paragraph') {
      convertBlockType(block.id, 'divider', false);
      return;
    }

    updateBlock(block.id, { content: val });

    // Slash command trigger
    const slashMatch = val.match(/(?:^|\s)\/([^\s]*)$/);
    if (slashMatch) {
      setSlashBlockId(block.id);
      setSlashFilter(slashMatch[1] || '');
      setSlashIndex(0);
    } else if (slashBlockId === block.id) {
      setSlashBlockId(null);
      setSlashFilter('');
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: DocBlock,
    index: number
  ) => {
    const isMod = e.metaKey || e.ctrlKey;

    // 1. Slash menu keyboard navigation
    if (slashBlockId === block.id && filteredSlashOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredSlashOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIndex(
          (i) =>
            (i - 1 + filteredSlashOptions.length) % filteredSlashOptions.length
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        convertBlockType(block.id, filteredSlashOptions[slashIndex].type, true);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSlashBlockId(null);
        setSlashFilter('');
        return;
      }
    }

    // 2. Notion keyboard shortcuts: Cmd/Ctrl + Alt + 0..9 (or Cmd/Ctrl + Shift + 4..8)
    if (isMod && (e.altKey || e.shiftKey)) {
      if (e.altKey && e.key === '0') {
        e.preventDefault();
        convertBlockType(block.id, 'paragraph');
        return;
      }
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        convertBlockType(block.id, 'h1');
        return;
      }
      if (e.altKey && e.key === '2') {
        e.preventDefault();
        convertBlockType(block.id, 'h2');
        return;
      }
      if (e.altKey && e.key === '3') {
        e.preventDefault();
        convertBlockType(block.id, 'h3');
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === '4' || e.code === 'Digit4')) {
        e.preventDefault();
        convertBlockType(block.id, 'todo');
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === '5' || e.code === 'Digit5')) {
        e.preventDefault();
        convertBlockType(block.id, 'bullet');
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === '6' || e.code === 'Digit6')) {
        e.preventDefault();
        convertBlockType(block.id, 'numbered');
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === '7' || e.code === 'Digit7')) {
        e.preventDefault();
        convertBlockType(block.id, 'quote');
        return;
      }
      if ((e.altKey || e.shiftKey) && (e.key === '8' || e.code === 'Digit8')) {
        e.preventDefault();
        convertBlockType(block.id, 'code');
        return;
      }
      if (e.altKey && e.key === '9' && onCreateSubPage) {
        e.preventDefault();
        convertBlockType(block.id, 'page');
        return;
      }
      if (e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault();
        moveBlock(block.id, -1);
        return;
      }
      if (e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault();
        moveBlock(block.id, 1);
        return;
      }
    }

    // 3. Cmd/Ctrl + D to duplicate block
    if (isMod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateBlock(block.id);
      return;
    }

    // 4. Cmd/Ctrl + Enter to toggle To-do check state
    if (isMod && e.key === 'Enter') {
      e.preventDefault();
      if (block.type === 'todo') {
        updateBlock(block.id, { checked: !block.checked });
      } else {
        addBlockAfter(block.id, 'paragraph');
      }
      return;
    }

    // 5. Enter to create next block (or exit list on empty item)
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code') {
      e.preventDefault();
      const continueType: DocBlockType =
        block.type === 'todo' ||
        block.type === 'bullet' ||
        block.type === 'numbered'
          ? block.type
          : 'paragraph';
      if (
        (block.type === 'todo' ||
          block.type === 'bullet' ||
          block.type === 'numbered' ||
          block.type === 'quote' ||
          block.type === 'callout') &&
        block.content.trim() === ''
      ) {
        updateBlock(block.id, { type: 'paragraph', checked: undefined });
      } else {
        addBlockAfter(block.id, continueType);
      }
      return;
    }

    // 6. Backspace at start of empty block
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      if (block.type !== 'paragraph') {
        updateBlock(block.id, { type: 'paragraph', checked: undefined });
      } else {
        removeBlock(block.id);
      }
      return;
    }

    // 7. Up/Down arrow navigation across blocks
    if (
      e.key === 'ArrowUp' &&
      !e.shiftKey &&
      !isMod &&
      e.currentTarget.selectionStart === 0 &&
      index > 0
    ) {
      const prev = blocks[index - 1];
      if (prev && prev.type !== 'divider' && prev.type !== 'page') {
        e.preventDefault();
        setFocusBlockId(prev.id);
      }
    } else if (
      e.key === 'ArrowDown' &&
      !e.shiftKey &&
      !isMod &&
      e.currentTarget.selectionStart === block.content.length &&
      index < blocks.length - 1
    ) {
      const next = blocks[index + 1];
      if (next && next.type !== 'divider' && next.type !== 'page') {
        e.preventDefault();
        setFocusBlockId(next.id);
      }
    }
  };

  let numberedCounter = 0;

  return (
    <div className="space-y-1">
      {/* Subtle Notion Shortcut Hint Bar */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pl-12 text-[11px] text-neutral-400 dark:text-neutral-500">
        <span>
          Type <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">/</kbd> for commands, or Markdown shortcuts:{' '}
          <code className="font-mono">#</code> H1 · <code className="font-mono">##</code> H2 · <code className="font-mono">[]</code> To-do · <code className="font-mono">-</code> List · <code className="font-mono">&gt;</code> Quote
        </span>
      </div>

      {/* Notion Block Canvas */}
      <div className="space-y-0.5">
        {blocks.map((block, index) => {
          if (block.type === 'numbered') {
            numberedCounter += 1;
          } else {
            numberedCounter = 0;
          }

          const isSlashOpen = slashBlockId === block.id;
          const isMenuOpen = menuBlockId === block.id;
          const isDragOver = dragOverBlockId === block.id;

          const baseInputClass =
            'w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-neutral-400/80 dark:placeholder:text-neutral-600';

          const typeSpecificClass =
            block.type === 'h1'
              ? 'font-display text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 pt-3 pb-1'
              : block.type === 'h2'
              ? 'font-display text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 pt-2.5 pb-0.5'
              : block.type === 'h3'
              ? 'font-display text-base font-semibold text-neutral-900 dark:text-neutral-100 pt-1.5'
              : block.type === 'quote'
              ? 'italic text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300'
              : block.type === 'code'
              ? 'font-mono text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-200'
              : 'text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200';

          return (
            <motion.div
              key={block.id}
              layout="position"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedBlockId && draggedBlockId !== block.id) {
                  setDragOverBlockId(block.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverBlockId === block.id) {
                  setDragOverBlockId(null);
                }
              }}
              onDrop={() => handleDropReorder(block.id)}
              className={`group relative flex items-start gap-1.5 rounded-md transition-colors ${
                isDragOver
                  ? 'bg-blue-50/50 dark:bg-blue-950/20'
                  : ''
              }`}
            >
              {/* True Notion Left Gutter: ONLY [+] and [⋮⋮] Six-Dot Grip Handle */}
              <div
                className={`mt-1 flex w-11 shrink-0 select-none items-center justify-end gap-0.5 transition-opacity duration-150 ${
                  isMenuOpen
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handlePlusClick(block)}
                  className="flex h-6 w-5 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Click to add block below"
                  aria-label="Add block"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDraggedBlockId(block.id)}
                    onDragEnd={() => {
                      setDraggedBlockId(null);
                      setDragOverBlockId(null);
                    }}
                    onClick={() => {
                      setTurnIntoOpen(false);
                      setMenuBlockId((curr) =>
                        curr === block.id ? null : block.id
                      );
                    }}
                    className="flex h-6 w-5 cursor-grab items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-200/70 hover:text-neutral-700 active:cursor-grabbing dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    title="Drag to move · Click to open menu"
                    aria-label="Block actions menu"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </button>

                  {/* Notion Six-Dot (⋮⋮) Action Popover */}
                  <AnimatePresence>
                    {isMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute left-0 top-full z-40 mt-1 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                      >
                        {/* Turn Into Sub-Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setTurnIntoOpen((prev) => !prev)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            <span className="flex items-center gap-2">
                              <Type className="h-3.5 w-3.5 text-neutral-400" />
                              <span>Turn into</span>
                            </span>
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
                                turnIntoOpen ? 'rotate-90' : ''
                              }`}
                            />
                          </button>

                          {turnIntoOpen && (
                            <div className="mt-1 space-y-0.5 border-l border-neutral-200 pl-2 dark:border-neutral-700">
                              {availableOptions
                                .filter((opt) => opt.type !== 'page')
                                .map((opt) => (
                                  <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() =>
                                      convertBlockType(block.id, opt.type, false)
                                    }
                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                                      block.type === opt.type
                                        ? 'bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                                        : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-neutral-400">
                                        {opt.icon}
                                      </span>
                                      <span>{opt.label}</span>
                                    </span>
                                    <span className="font-mono text-[10px] text-neutral-400">
                                      {opt.shortcut}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>

                        {onCreateSubPage && (
                          <button
                            type="button"
                            onClick={() =>
                              convertBlockType(block.id, 'page', false)
                            }
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                          >
                            <span className="flex items-center gap-2">
                              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Turn into Sub-Page</span>
                            </span>
                            <span className="font-mono text-[10px] text-neutral-400">
                              ⌘⌥9
                            </span>
                          </button>
                        )}

                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                        <button
                          type="button"
                          onClick={() => duplicateBlock(block.id)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          <span className="flex items-center gap-2">
                            <Copy className="h-3.5 w-3.5 text-neutral-400" />
                            <span>Duplicate</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            ⌘D
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, -1)}
                          disabled={index === 0}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-35 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          <span className="flex items-center gap-2">
                            <ArrowUp className="h-3.5 w-3.5 text-neutral-400" />
                            <span>Move up</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            ⌘⇧↑
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, 1)}
                          disabled={index === blocks.length - 1}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-35 dark:text-neutral-200 dark:hover:bg-neutral-800"
                        >
                          <span className="flex items-center gap-2">
                            <ArrowDown className="h-3.5 w-3.5 text-neutral-400" />
                            <span>Move down</span>
                          </span>
                          <span className="font-mono text-[10px] text-neutral-400">
                            ⌘⇧↓
                          </span>
                        </button>

                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <span className="flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </span>
                          <span className="font-mono text-[10px] opacity-75">
                            Del
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Block Content */}
              <div className="relative min-w-0 flex-1">
                {block.type === 'divider' ? (
                  <div className="flex items-center gap-2 py-3">
                    <hr className="flex-1 border-neutral-200 dark:border-neutral-800" />
                  </div>
                ) : block.type === 'page' ? (
                  <div
                    onClick={() => {
                      if (block.docId && onOpenPageDoc) {
                        onOpenPageDoc(block.docId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        block.docId &&
                        onOpenPageDoc
                      ) {
                        e.preventDefault();
                        onOpenPageDoc(block.docId);
                      }
                    }}
                    className="my-1 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3.5 py-2 transition-colors hover:border-neutral-300 hover:bg-neutral-100/80 dark:border-neutral-800 dark:bg-[#20201E] dark:hover:border-neutral-700 dark:hover:bg-neutral-800/70"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                      <span className="truncate text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 dark:text-neutral-100 dark:decoration-neutral-700">
                        {block.content || 'Untitled Sub-page'}
                      </span>
                      <span className="shrink-0 text-[11px] text-neutral-400">
                        Sub-page
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {block.docId && onOpenPageDoc && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                      {block.docUrl && (
                        <a
                          href={block.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                          title="Open in Google Docs"
                          aria-label="Open sub-page in Google Docs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-start gap-2.5 rounded-lg ${
                      block.type === 'callout'
                        ? 'my-1 border border-neutral-200 bg-[#F8F8F7] px-3.5 py-2.5 dark:border-neutral-800 dark:bg-[#20201E]'
                        : block.type === 'code'
                        ? 'my-1 border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 dark:border-neutral-800 dark:bg-[#141413]'
                        : block.type === 'quote'
                        ? 'my-1 border border-neutral-200/80 bg-neutral-50/50 px-3.5 py-2 dark:border-neutral-800 dark:bg-neutral-900/30'
                        : 'py-0.5'
                    }`}
                  >
                    {block.type === 'todo' && (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.82 }}
                        onClick={() =>
                          updateBlock(block.id, { checked: !block.checked })
                        }
                        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          block.checked
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-neutral-300 bg-white hover:border-neutral-400 dark:border-neutral-600 dark:bg-transparent'
                        }`}
                        aria-label="Toggle to-do checkbox"
                      >
                        <AnimatePresence initial={false}>
                          {block.checked && (
                            <motion.span
                              key="check-icon"
                              initial={{ scale: 0.4, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.4, opacity: 0 }}
                              transition={{ duration: 0.12 }}
                            >
                              <Check className="h-3 w-3 stroke-[2.5]" />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    )}

                    {block.type === 'bullet' && (
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-500 dark:bg-neutral-400" />
                    )}

                    {block.type === 'numbered' && (
                      <span className="mt-0.5 w-5 shrink-0 font-mono text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
                        {numberedCounter}.
                      </span>
                    )}

                    {block.type === 'callout' && (
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    )}

                    <textarea
                      ref={(el) => {
                        inputRefs.current[block.id] = el;
                        autoResize(el);
                      }}
                      rows={1}
                      value={block.content}
                      onFocus={() => {
                        setActiveBlockId(block.id);
                      }}
                      onChange={(e) => {
                        autoResize(e.target);
                        handleContentChange(block, e.target.value);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, block, index)}
                      placeholder={
                        block.type === 'h1'
                          ? 'Heading 1'
                          : block.type === 'h2'
                          ? 'Heading 2'
                          : block.type === 'h3'
                          ? 'Heading 3'
                          : block.type === 'todo'
                          ? 'To-do'
                          : block.type === 'bullet'
                          ? 'List'
                          : block.type === 'numbered'
                          ? 'List'
                          : block.type === 'quote'
                          ? 'Empty quote'
                          : block.type === 'callout'
                          ? 'Type a callout...'
                          : block.type === 'code'
                          ? 'Write code...'
                          : activeBlockId === block.id || blocks.length === 1
                          ? "Write, press '/' for commands..."
                          : ''
                      }
                      className={`${baseInputClass} ${typeSpecificClass} ${
                        block.type === 'todo' && block.checked
                          ? 'line-through text-neutral-400 dark:text-neutral-500'
                          : ''
                      }`}
                    />
                  </div>
                )}

                {/* Notion Slash Command Menu */}
                <AnimatePresence>
                  {isSlashOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-full z-30 mt-1 w-72 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-[#242422]"
                    >
                      <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-neutral-400">
                        <span>Basic blocks</span>
                        <span className="font-mono text-[10px]">↑↓ to select</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {filteredSlashOptions.length === 0 ? (
                          <div className="px-2.5 py-2 text-xs text-neutral-500">
                            No matching blocks
                          </div>
                        ) : (
                          filteredSlashOptions.map((opt, optIdx) => (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() =>
                                convertBlockType(block.id, opt.type, true)
                              }
                              className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                optIdx === slashIndex
                                  ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100'
                                  : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                                  {opt.icon}
                                </span>
                                <div className="min-w-0">
                                  <div className="truncate text-xs font-medium">
                                    {opt.label}
                                  </div>
                                  <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                                    {opt.hint}
                                  </div>
                                </div>
                              </div>
                              <kbd className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                                {opt.shortcut}
                              </kbd>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}

        {/* Quiet click-to-append area below blocks */}
        <div className="ml-12 mt-1 flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const last = blocks[blocks.length - 1];
              if (last) {
                addBlockAfter(last.id, 'paragraph');
              } else {
                const first: DocBlock = {
                  id: uid('blk'),
                  type: 'paragraph',
                  content: '',
                };
                onChange([first]);
                setFocusBlockId(first.id);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New line</span>
          </button>
          {onCreateSubPage && (
            <button
              type="button"
              onClick={() => setSubPagePrompt({ title: '' })}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <FilePlus2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>New sub-page</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Notion Sub-Page Title Modal */}
      <AnimatePresence>
        {subPagePrompt && onCreateSubPage && (
          <motion.div
            key="subpage-prompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="fixed inset-0 z-[45] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
            onClick={() => setSubPagePrompt(null)}
          >
            <motion.form
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault();
                const cleanTitle =
                  subPagePrompt.title.trim() || 'Untitled Sub-page';
                onCreateSubPage(cleanTitle, subPagePrompt.replaceBlockId);
                setSubPagePrompt(null);
              }}
              className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-[#20201E]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FilePlus2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-display text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    New Sub-Page inside Document
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSubPagePrompt(null)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label="Close sub-page prompt"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Creates a nested Google Doc linked inside this page so you can open and write in it whole-screen, just like Notion pages inside a page.
              </p>
              <input
                type="text"
                autoFocus
                value={subPagePrompt.title}
                onChange={(e) =>
                  setSubPagePrompt((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                placeholder="Sub-page title..."
                className="w-full rounded-lg border border-neutral-200 bg-[#F8F8F7] px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-100"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSubPagePrompt(null)}
                  className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-[#191918] dark:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                  <span>Create & Open Page</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
