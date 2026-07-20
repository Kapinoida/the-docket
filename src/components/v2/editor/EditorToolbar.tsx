import React from 'react';
import { Editor } from '@tiptap/react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  CheckSquare,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
  Highlighter,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Trash2,
  Plus, 
  GripVertical, 
  GripHorizontal,
  MoreHorizontal,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  pageTitle?: string;
}

type ToolbarGroup = 'format' | 'headings' | 'lists' | 'blocks' | 'align' | 'insert';

interface ToolbarItem {
  id: string;
  icon: any;
  title: string;
  group: ToolbarGroup;
  action: (e: Editor) => void;
  isActive: (e: Editor) => boolean;
}

const ToggleButton = ({ onClick, isActive, icon: Icon, title, className = '' }: any) => (
  <button
    onMouseDown={(e: React.MouseEvent) => { e.preventDefault(); onClick?.(); }}
    className={`min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center ${
      isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
    } ${className}`}
    title={title}
  >
    <Icon size={18} />
  </button>
);

const GroupSeparator = () => (
  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />
);

export function exportMarkdown(editor: Editor, pageTitle?: string) {
  // @ts-expect-error - tiptap-markdown storage is untyped
  const markdownOutput = editor.storage.markdown.getMarkdown();
  const blob = new Blob([markdownOutput], { type: 'text/markdown;charset=utf-8' });
  let title = 'Note';
  const firstHeadingMatch = markdownOutput.match(/^#\s+(.*)/m);
  if (firstHeadingMatch && firstHeadingMatch[1]) title = firstHeadingMatch[1].trim();
  else title = pageTitle || 'Untitled Note';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Primary buttons IDs visible on all screen sizes
const PRIMARY_IDS = ['bold', 'italic', 'list', 'heading1', 'check'];

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: 'bold', icon: Bold, title: 'Bold', group: 'format', action: (e) => e.chain().focus().toggleBold().run(), isActive: (e) => e.isActive('bold') },
  { id: 'italic', icon: Italic, title: 'Italic', group: 'format', action: (e) => e.chain().focus().toggleItalic().run(), isActive: (e) => e.isActive('italic') },
  { id: 'strike', icon: Strikethrough, title: 'Strikethrough', group: 'format', action: (e) => e.chain().focus().toggleStrike().run(), isActive: (e) => e.isActive('strike') },
  { id: 'highlight', icon: Highlighter, title: 'Highlight', group: 'format', action: (e) => e.chain().focus().toggleHighlight().run(), isActive: (e) => e.isActive('highlight') },
  { id: 'heading1', icon: Heading1, title: 'Heading 1', group: 'headings', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e) => e.isActive('heading', { level: 1 }) },
  { id: 'heading2', icon: Heading2, title: 'Heading 2', group: 'headings', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { id: 'list', icon: List, title: 'Bullet List', group: 'lists', action: (e) => e.chain().focus().toggleBulletList().run(), isActive: (e) => e.isActive('bulletList') },
  { id: 'orderedList', icon: ListOrdered, title: 'Ordered List', group: 'lists', action: (e) => e.chain().focus().toggleOrderedList().run(), isActive: (e) => e.isActive('orderedList') },
  { id: 'check', icon: CheckSquare, title: 'Task List', group: 'lists', action: (e) => e.chain().focus().toggleTaskList().run(), isActive: (e) => e.isActive('taskList') },
  { id: 'quote', icon: Quote, title: 'Quote', group: 'blocks', action: (e) => e.chain().focus().toggleBlockquote().run(), isActive: (e) => e.isActive('blockquote') },
  { id: 'code', icon: Code, title: 'Code Block', group: 'blocks', action: (e) => e.chain().focus().toggleCodeBlock().run(), isActive: (e) => e.isActive('codeBlock') },
  { id: 'alignLeft', icon: AlignLeft, title: 'Align Left', group: 'align', action: (e) => e.chain().focus().setTextAlign('left').run(), isActive: (e) => e.isActive({ textAlign: 'left' }) },
  { id: 'alignCenter', icon: AlignCenter, title: 'Align Center', group: 'align', action: (e) => e.chain().focus().setTextAlign('center').run(), isActive: (e) => e.isActive({ textAlign: 'center' }) },
  { id: 'alignRight', icon: AlignRight, title: 'Align Right', group: 'align', action: (e) => e.chain().focus().setTextAlign('right').run(), isActive: (e) => e.isActive({ textAlign: 'right' }) },
  { id: 'table', icon: TableIcon, title: 'Insert Table', group: 'insert', action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), isActive: () => false },
];

const GROUP_ORDER: ToolbarGroup[] = ['format', 'headings', 'lists', 'blocks', 'align', 'insert'];

function itemsByGroup(items: ToolbarItem[]) {
  return GROUP_ORDER.map(g => ({ group: g, items: items.filter(i => i.group === g) })).filter(g => g.items.length > 0);
}

export const EditorToolbar = ({ editor, pageTitle }: EditorToolbarProps) => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const [showMore, setShowMore] = React.useState(false);
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const moreRef = React.useRef<HTMLDivElement>(null);
  const linkInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editor) return;
    const handleUpdate = () => forceUpdate();
    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);
    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  React.useEffect(() => {
    if (!showMore) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore]);

  React.useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [showLinkInput]);

  if (!editor) return null;

  const isTableActive = editor.isActive('table');
  const primaryItems = TOOLBAR_ITEMS.filter(i => PRIMARY_IDS.includes(i.id));

  const handleLinkAction = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkInput(true);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const cancelLink = () => {
    setShowLinkInput(false);
    setLinkUrl('');
    editor.chain().focus().run();
  };

  // Link item uses a custom action
  const linkItem: ToolbarItem = {
    id: 'link',
    icon: LinkIcon,
    title: 'Link',
    group: 'format',
    action: handleLinkAction,
    isActive: (e: Editor) => e.isActive('link'),
  };

  const allItems = [linkItem, ...TOOLBAR_ITEMS.filter(i => i.id !== 'link')];

  const TableControls = () => (
    <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 rounded px-1 animate-in fade-in slide-in-from-top-1 duration-150">
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Column Before">
        <div className="flex items-center"><Plus size={10} /><GripVertical size={14} /></div>
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Column After">
        <div className="flex items-center"><GripVertical size={14} /><Plus size={10} /></div>
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center" title="Delete Column">
        <div className="flex items-center"><Trash2 size={10} /><GripVertical size={14} /></div>
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Row Before">
        <div className="flex flex-col items-center"><Plus size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Row After">
        <div className="flex flex-col items-center"><GripHorizontal size={14} /><Plus size={10} style={{ marginTop: -2 }} /></div>
      </button>
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center" title="Delete Row">
        <div className="flex flex-col items-center"><Trash2 size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 flex items-center justify-center" title="Delete Table">
        <Trash2 size={16} />
      </button>
    </div>
  );

  const ToolbarButton = ({ item }: { item: ToolbarItem }) => (
    <ToggleButton
      onClick={() => item.action(editor)}
      isActive={item.isActive(editor)}
      icon={item.icon}
      title={item.title}
    />
  );

  const renderGrouped = (items: ToolbarItem[]) => {
    const groups = itemsByGroup(items);
    return groups.map((g, gi) => (
      <React.Fragment key={g.group}>
        {gi > 0 && <GroupSeparator />}
        {g.items.map(item => <ToolbarButton key={item.id} item={item} />)}
      </React.Fragment>
    ));
  };

  const LinkInput = () => {
    if (!showLinkInput) return null;
    return (
      <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1">
        <input
          ref={linkInputRef}
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
            if (e.key === 'Escape') { e.preventDefault(); cancelLink(); }
          }}
          onBlur={applyLink}
          placeholder="https://..."
          className="text-sm px-2 py-1 w-48 bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
          className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
        >
          Apply
        </button>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {isTableActive && <TableControls />}

      {showLinkInput && <LinkInput />}

      {/* Desktop: all buttons visible, grouped */}
      <div className="hidden md:flex items-center gap-1 flex-wrap">
        {renderGrouped(allItems)}
        <GroupSeparator />
        <ToggleButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Undo" />
        <ToggleButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="Redo" />
      </div>

      {/* Mobile: primary buttons + "More" dropdown */}
      <div className="flex md:hidden items-center gap-1 flex-wrap">
        {primaryItems.map(item => (
          <ToolbarButton key={item.id} item={item} />
        ))}
        <ToggleButton onClick={() => handleLinkAction()} isActive={editor.isActive('link')} icon={LinkIcon} title="Link" />
        {/* Undo/Redo always visible */}
        <ToggleButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Undo" />
        <ToggleButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="Redo" />

        {/* More button */}
        <div className="relative" ref={moreRef}>
          <button
            onMouseDown={(e) => { e.preventDefault(); setShowMore(!showMore); }}
            className={`min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-gray-500 dark:text-gray-400 ${showMore ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            title="More formatting"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMore && (
            <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-50 flex flex-wrap gap-1 max-w-[320px] justify-end">
              {secondaryItems().map(item => (
                <ToolbarButton key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function secondaryItems() {
    return TOOLBAR_ITEMS.filter(i => !PRIMARY_IDS.includes(i.id) && i.id !== 'link');
  }
};