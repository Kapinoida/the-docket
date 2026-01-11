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
  GripHorizontal
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  React.useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
        forceUpdate();
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);

    return () => {
        editor.off('selectionUpdate', handleUpdate);
        editor.off('transaction', handleUpdate);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const ToggleButton = ({ onClick, isActive, icon: Icon, title }: any) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
      }`}
      title={title}
    >
      <Icon size={18} />
    </button>
  );



  const isTableActive = editor.isActive('table');

  return (
    <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4 flex-wrap">
      {isTableActive && (
         <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 rounded px-1">
            <button
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title="Add Column Before"
            >
                <div className="flex items-center"><Plus size={10} /><GripVertical size={14} /></div>
            </button>
             <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title="Add Column After"
            >
                <div className="flex items-center"><GripVertical size={14} /><Plus size={10} /></div>
            </button>
             <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                title="Delete Column"
            >
                <div className="flex items-center"><Trash2 size={10} /><GripVertical size={14} /></div>
            </button>
             <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title="Add Row Before"
            >
                <div className="flex flex-col items-center"><Plus size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
            </button>
             <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title="Add Row After"
            >
                 <div className="flex flex-col items-center"><GripHorizontal size={14} /><Plus size={10} style={{ marginTop: -2 }} /></div>
            </button>
             <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                title="Delete Row"
            >
                <div className="flex flex-col items-center"><Trash2 size={10} style={{ marginBottom: -2 }} /><GripHorizontal size={14} /></div>
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
             <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                title="Delete Table"
            >
                <Trash2 size={16} />
            </button>
         </div>
      )}
      <ToggleButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="Bold"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="Italic"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        title="Strikethrough"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        icon={Highlighter}
        title="Highlight"
      />
      <ToggleButton
         onClick={() => {
            const previousUrl = editor.getAttributes('link').href;
            const url = window.prompt('URL', previousUrl);
            if (url === null) return;
            if (url === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
            }
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }}
        isActive={editor.isActive('link')}
        icon={LinkIcon}
        title="Link"
      />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="Heading 1"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="Bullet List"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="Ordered List"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleTaskList().run()} // Assuming standard task or custom?
        // Note: Our custom task logic might use `insertV2Task`. 
        // But `toggleTaskList` is for the standard tiptap extension unless we hooked it.
        // Let's use our insert flow or checking if standard text.
        // Actually, Tiptap's TaskList is what we likely want for simple lists.
        // But we have `TaskExtension` which might be custom (atom based).
        // Let's stick to what works: slash command uses internal logic.
        // For the buttons, let's use standard behaviors if they exist.
        // If we want "Insert Task Item", we used prompts before.
        isActive={editor.isActive('taskList')}
        icon={CheckSquare}
        title="Task List"
      />
       <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        title="Quote"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        icon={Code}
        title="Code Block"
      />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        icon={AlignLeft}
        title="Align Left"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        icon={AlignCenter}
        title="Align Center"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        icon={AlignRight}
        title="Align Right"
      />
      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        isActive={false} // Table insertion is an action, not a state usually (unless inside table)
        icon={TableIcon}
        title="Insert 3x3 Table"
      />
      <div className="flex-1" />
      <ToggleButton
        onClick={() => editor.chain().focus().undo().run()}
        isActive={false}
        icon={Undo}
        title="Undo"
      />
      <ToggleButton
        onClick={() => editor.chain().focus().redo().run()}
        isActive={false}
        icon={Redo}
        title="Redo"
      />
    </div>
  );
};
