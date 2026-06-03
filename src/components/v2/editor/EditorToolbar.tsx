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
  Download,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  pageTitle?: string;
}

const ToggleButton = ({ onClick, isActive, icon: Icon, title, className = '' }: any) => (
  <button
    onClick={onClick}
    className={`min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center ${
      isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
    } ${className}`}
    title={title}
  >
    <Icon size={18} />
  </button>
);

// Primary buttons visible on all screen sizes
const PRIMARY_ACTIONS = ['bold', 'italic', 'list', 'heading', 'check'];

// All toolbar button definitions
const TOOLBAR_ITEMS = [
  { id: 'bold', icon: Bold, title: 'Bold', action: (e: Editor) => e.chain().focus().toggleBold().run(), isActive: (e: Editor) => e.isActive('bold') },
  { id: 'italic', icon: Italic, title: 'Italic', action: (e: Editor) => e.chain().focus().toggleItalic().run(), isActive: (e: Editor) => e.isActive('italic') },
  { id: 'strike', icon: Strikethrough, title: 'Strikethrough', action: (e: Editor) => e.chain().focus().toggleStrike().run(), isActive: (e: Editor) => e.isActive('strike') },
  { id: 'highlight', icon: Highlighter, title: 'Highlight', action: (e: Editor) => e.chain().focus().toggleHighlight().run(), isActive: (e: Editor) => e.isActive('highlight') },
  { id: 'link', icon: LinkIcon, title: 'Link', action: (e: Editor) => {
    const previousUrl = e.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') { e.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    e.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, isActive: (e: Editor) => e.isActive('link') },
  { id: 'heading1', icon: Heading1, title: 'Heading 1', action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 1 }) },
  { id: 'heading2', icon: Heading2, title: 'Heading 2', action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e: Editor) => e.isActive('heading', { level: 2 }) },
  { id: 'list', icon: List, title: 'Bullet List', action: (e: Editor) => e.chain().focus().toggleBulletList().run(), isActive: (e: Editor) => e.isActive('bulletList') },
  { id: 'orderedList', icon: ListOrdered, title: 'Ordered List', action: (e: Editor) => e.chain().focus().toggleOrderedList().run(), isActive: (e: Editor) => e.isActive('orderedList') },
  { id: 'check', icon: CheckSquare, title: 'Task List', action: (e: Editor) => e.chain().focus().toggleTaskList().run(), isActive: (e: Editor) => e.isActive('taskList') },
  { id: 'quote', icon: Quote, title: 'Quote', action: (e: Editor) => e.chain().focus().toggleBlockquote().run(), isActive: (e: Editor) => e.isActive('blockquote') },
  { id: 'code', icon: Code, title: 'Code Block', action: (e: Editor) => e.chain().focus().toggleCodeBlock().run(), isActive: (e: Editor) => e.isActive('codeBlock') },
  { id: 'alignLeft', icon: AlignLeft, title: 'Align Left', action: (e: Editor) => e.chain().focus().setTextAlign('left').run(), isActive: (e: Editor) => e.isActive({ textAlign: 'left' }) },
  { id: 'alignCenter', icon: AlignCenter, title: 'Align Center', action: (e: Editor) => e.chain().focus().setTextAlign('center').run(), isActive: (e: Editor) => e.isActive({ textAlign: 'center' }) },
  { id: 'alignRight', icon: AlignRight, title: 'Align Right', action: (e: Editor) => e.chain().focus().setTextAlign('right').run(), isActive: (e: Editor) => e.isActive({ textAlign: 'right' }) },
  { id: 'table', icon: TableIcon, title: 'Insert Table', action: (e: Editor) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), isActive: () => false },
];

export const EditorToolbar = ({ editor, pageTitle }: EditorToolbarProps) => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const [showMore, setShowMore] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

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

  // Close "More" menu when clicking outside
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

  if (!editor) return null;

  const isTableActive = editor.isActive('table');
  const primaryItems = TOOLBAR_ITEMS.filter(i => PRIMARY_ACTIONS.includes(i.id));
  const secondaryItems = TOOLBAR_ITEMS.filter(i => !PRIMARY_ACTIONS.includes(i.id));

  const TableControls = () => (
    <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 rounded px-1">
      <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Column Before">
        <div className="flex items-center"><Plus size={10} /><GripVertical size={14} /></div>
      </button>
      <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Column After">
        <div className="flex items-center"><GripVertical size={14} /><Plus size={10} /></div>
      </button>
      <button onClick={() => editor.chain().focus().deleteColumn().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center" title="Delete Column">
        <div className="flex items-center"><Trash2 size={10} /><GripVertical size={14} /></div>
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button onClick={() => editor.chain().focus().addRowBefore().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Row Before">
        <div className="flex flex-col items-center"><Plus size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
      </button>
      <button onClick={() => editor.chain().focus().addRowAfter().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center" title="Add Row After">
        <div className="flex flex-col items-center"><GripHorizontal size={14} /><Plus size={10} style={{ marginTop: -2 }} /></div>
      </button>
      <button onClick={() => editor.chain().focus().deleteRow().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 flex items-center justify-center" title="Delete Row">
        <div className="flex flex-col items-center"><Trash2 size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
      </button>
      <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
      <button onClick={() => editor.chain().focus().deleteTable().run()} className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 flex items-center justify-center" title="Delete Table">
        <Trash2 size={16} />
      </button>
    </div>
  );

  const ToolbarButton = ({ item }: { item: typeof TOOLBAR_ITEMS[0] }) => (
    <ToggleButton
      onClick={() => item.action(editor)}
      isActive={item.isActive(editor)}
      icon={item.icon}
      title={item.title}
    />
  );

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex-wrap">
      {isTableActive && <TableControls />}

      {/* Desktop: all buttons visible */}
      <div className="hidden md:flex items-center gap-1 flex-wrap">
        {TOOLBAR_ITEMS.map(item => (
          <ToolbarButton key={item.id} item={item} />
        ))}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
        <ToggleButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Undo" />
        <ToggleButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="Redo" />
        <ToggleButton
          onClick={() => {
            // @ts-ignore
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
          }}
          isActive={false}
          icon={Download}
          title="Export as Markdown"
        />
      </div>

      {/* Mobile: primary buttons + "More" dropdown */}
      <div className="flex md:hidden items-center gap-1 flex-wrap">
        {primaryItems.map(item => (
          <ToolbarButton key={item.id} item={item} />
        ))}
        
        {/* Undo/Redo always visible */}
        <ToggleButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo} title="Undo" />
        <ToggleButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo} title="Redo" />

        {/* More button */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => setShowMore(!showMore)}
            className={`min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-gray-500 dark:text-gray-400 ${showMore ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
            title="More formatting"
          >
            <MoreHorizontal size={18} />
          </button>

          {showMore && (
            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-2 z-50 flex flex-wrap gap-1 max-w-[280px]">
              {secondaryItems.map(item => (
                <ToolbarButton key={item.id} item={item} />
              ))}
              <div className="w-full border-t border-gray-100 dark:border-gray-700 my-1" />
              <ToggleButton
                onClick={() => {
                  // @ts-ignore
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
                }}
                isActive={false}
                icon={Download}
                title="Export MD"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
