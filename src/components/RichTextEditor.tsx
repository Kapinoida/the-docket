'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { Strike } from '@tiptap/extension-strike';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { useCallback, useEffect, useState } from 'react';
import { TaskExtension } from '@/lib/tiptap-task-extension';
import { TaskNode } from '@/lib/tiptap-task-node';
import { TaskWidgetExtension } from '@/extensions/TaskWidgetExtension';
import { ParsedTask } from '@/lib/taskParser';
import { useTaskEdit } from '@/contexts/TaskEditContext';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  noteId?: string;
  onTasksFound?: (tasks: ParsedTask[]) => void;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  readOnly = false,
  noteId,
  onTasksFound,
  onTaskToggle
}: RichTextEditorProps) {
  const [isMounted, setIsMounted] = useState(false);
  const { openTaskEdit } = useTaskEdit();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false, // Disable bullet list to prevent interference with task syntax
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        taskList: false, // Disable built-in task list to use custom handler
        strike: false, // Disable built-in strike to add it separately
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      Strike,
      TextStyle,
      Color,
      TaskWidgetExtension,
    ],
    content,
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle task widget events
  const handleTaskEdit = useCallback(async (data: { taskId: string }) => {
    console.log('Task edit requested:', data.taskId);
    
    try {
      // Fetch the full task data
      const response = await fetch(`/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [data.taskId] }),
      });
      
      if (response.ok) {
        const tasks = await response.json();
        const task = tasks[0];
        if (task) {
          openTaskEdit(task);
        }
      }
    } catch (error) {
      console.error('Failed to fetch task for editing:', error);
    }
  }, [openTaskEdit]);

  const handleCreateNewTask = useCallback(async () => {
    console.log('Create new task requested');
    
    if (!editor || !noteId) return;
    
    try {
      // Create a new task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'New task',
          dueDate: null,
        }),
      });
      
      if (response.ok) {
        const task = await response.json();
        // Insert task widget at cursor
        editor.commands.insertTaskWidget(task.id);
      }
    } catch (error) {
      console.error('Failed to create new task:', error);
    }
  }, [editor, noteId]);

  // Convert markdown tasks to widgets on content update
  const convertMarkdownTasks = useCallback(async () => {
    if (!editor || !noteId || readOnly) return;
    
    const { convertMarkdownTasksToWidgets } = await import('@/lib/taskPosition');
    
    const createTaskFromMarkdown = async (content: string, dueDate?: Date): Promise<string> => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          dueDate: dueDate?.toISOString(),
        }),
      });
      
      if (response.ok) {
        const task = await response.json();
        return task.id;
      }
      
      throw new Error('Failed to create task');
    };
    
    try {
      const conversions = await convertMarkdownTasksToWidgets(
        editor,
        noteId,
        createTaskFromMarkdown
      );
      
      if (conversions > 0) {
        console.log(`Converted ${conversions} markdown tasks to widgets`);
        onChange(editor.getHTML());
      }
    } catch (error) {
      console.error('Failed to convert markdown tasks:', error);
    }
  }, [editor, noteId, readOnly, onChange]);

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && isMounted && editor.getHTML() !== content) {
      // Wrap in setTimeout to avoid flushSync error during React lifecycle
      setTimeout(() => {
        if (editor.getHTML() !== content) {
          editor.commands.setContent(content, false);
        }
      }, 0);
    }
  }, [editor, content, isMounted]);

  // Set up task widget event listeners
  useEffect(() => {
    if (editor) {
      editor.on('taskEdit', handleTaskEdit);
      editor.on('createNewTask', handleCreateNewTask);
      
      return () => {
        editor.off('taskEdit', handleTaskEdit);
        editor.off('createNewTask', handleCreateNewTask);
      };
    }
  }, [editor, handleTaskEdit, handleCreateNewTask]);

  // Convert markdown tasks to widgets after content stabilizes
  useEffect(() => {
    if (editor && isMounted && !readOnly) {
      const timeoutId = setTimeout(() => {
        convertMarkdownTasks();
      }, 1000); // Wait 1 second after content change
      
      return () => clearTimeout(timeoutId);
    }
  }, [editor, content, isMounted, readOnly, convertMarkdownTasks]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run();
  }, [editor]);

  const toggleStrike = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  // Removed toggleBulletList since bullet lists are disabled to prevent task syntax conflicts

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const setHeading = useCallback((level: 1 | 2 | 3) => {
    editor?.chain().focus().toggleHeading({ level }).run();
  }, [editor]);

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  const insertTaskWidget = useCallback(async () => {
    if (!editor || !noteId) return;
    
    try {
      // Create a new task
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'New task',
          dueDate: new Date(),
        }),
      });
      
      if (response.ok) {
        const task = await response.json();
        editor.commands.insertTaskWidget(task.id);
      }
    } catch (error) {
      console.error('Failed to create task widget:', error);
    }
  }, [editor, noteId]);

  // Show loading state during SSR and initial client render
  if (!isMounted || !editor) {
    return (
      <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
        {!readOnly && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
            <div className="flex items-center gap-1">
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        )}
        <div className={`${readOnly ? 'min-h-[100px]' : 'min-h-[200px]'} max-h-[600px] p-4 flex items-center justify-center`}>
          <div className="text-gray-500 dark:text-gray-400">Loading editor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Text formatting */}
            <ToolbarButton
              onClick={toggleBold}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleItalic}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleUnderline}
              isActive={editor.isActive('underline')}
              title="Underline (Ctrl+U)"
            >
              <u>U</u>
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleStrike}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <s>S</s>
            </ToolbarButton>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Headings */}
            <ToolbarButton
              onClick={setParagraph}
              isActive={editor.isActive('paragraph')}
              title="Paragraph"
            >
              P
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setHeading(1)}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setHeading(2)}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setHeading(3)}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              H3
            </ToolbarButton>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={toggleOrderedList}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              1.
            </ToolbarButton>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Blockquote */}
            <ToolbarButton
              onClick={toggleBlockquote}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              &quot;
            </ToolbarButton>

            {/* Separator */}
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Task Widget */}
            <ToolbarButton
              onClick={insertTaskWidget}
              title="Insert Task Widget (Ctrl+Shift+T)"
            >
              ☐
            </ToolbarButton>

            {/* Convert Markdown Tasks */}
            <ToolbarButton
              onClick={convertMarkdownTasks}
              title="Convert Markdown Tasks to Widgets"
            >
              ⚡
            </ToolbarButton>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className={`${readOnly ? 'min-h-[100px]' : 'min-h-[200px]'} max-h-[600px] overflow-y-auto`}>
        <EditorContent
          editor={editor}
          className={`prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none ${
            readOnly ? 'cursor-default' : ''
          }`}
        />
      </div>
    </div>
  );
}