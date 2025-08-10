'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ParsedTask, parseTasksFromContent } from '@/lib/taskParser';
import TaskCheckbox from './TaskCheckbox';

interface StyledMarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTasksFound?: (tasks: ParsedTask[]) => void;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  placeholder?: string;
  className?: string;
  noteId?: string;
  readOnly?: boolean;
  refreshTrigger?: number; // Used to trigger refresh of task statuses
  taskMap?: Record<string, string>; // Map from inline UUIDs to database IDs
}

interface LineData {
  id: string;
  rawMarkdown: string;
  isEditing: boolean;
}

export default function StyledMarkdownEditor({
  content,
  onChange,
  onTasksFound,
  onTaskToggle,
  placeholder = 'Start writing...',
  className = '',
  noteId,
  readOnly = false,
  refreshTrigger,
  taskMap = {}
}: StyledMarkdownEditorProps) {
  const [lines, setLines] = useState<LineData[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isUpdatingContent, setIsUpdatingContent] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, boolean>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);

  // Fetch current task statuses from the database
  const fetchTaskStatuses = async () => {
    if (!noteId || Object.keys(taskMap).length === 0) {
      console.log('[StyledMarkdownEditor] No task map available, skipping status fetch');
      return;
    }
    
    try {
      // Extract all inline task IDs from the content (UUIDs)
      const inlineTaskIds: string[] = [];
      const taskIdRegex = /<!-- task-id:([^>]+) -->/g;
      let match;
      while ((match = taskIdRegex.exec(content)) !== null) {
        const inlineTaskId = match[1].trim();
        if (inlineTaskId && taskMap[inlineTaskId]) {
          inlineTaskIds.push(inlineTaskId);
        } else {
          console.warn('[StyledMarkdownEditor] No database mapping found for inline task ID:', inlineTaskId);
        }
      }
      
      // Get the corresponding database task IDs
      const dbTaskIds = inlineTaskIds.map(inlineId => taskMap[inlineId]).filter(Boolean);
      
      console.log('[StyledMarkdownEditor] Found inline task IDs:', inlineTaskIds);
      console.log('[StyledMarkdownEditor] Corresponding database task IDs:', dbTaskIds);
      
      if (dbTaskIds.length === 0) return;
      
      // Fetch current statuses for these tasks
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: dbTaskIds })
      });
      
      if (response.ok) {
        const tasks = await response.json();
        const statusMap: Record<string, boolean> = {};
        
        // Map the database task statuses back to inline task IDs
        tasks.forEach((task: any) => {
          const dbTaskId = task.id;
          // Find the inline task ID that maps to this database task ID
          const inlineTaskId = Object.keys(taskMap).find(inlineId => taskMap[inlineId] === dbTaskId);
          if (inlineTaskId) {
            statusMap[inlineTaskId] = task.completed;
          }
        });
        
        setTaskStatuses(statusMap);
        console.log('[StyledMarkdownEditor] Updated task statuses:', statusMap);
      } else {
        console.error('[StyledMarkdownEditor] Error response from API:', response.status, await response.text());
      }
    } catch (error) {
      console.error('[StyledMarkdownEditor] Error fetching task statuses:', error);
    }
  };

  // Fetch task statuses when content changes, when the component mounts, or when refresh is triggered
  useEffect(() => {
    fetchTaskStatuses();
  }, [content, noteId, refreshTrigger, JSON.stringify(taskMap)]);

  // Helper function to scroll editing line into view
  const scrollIntoView = (lineId: string) => {
    setTimeout(() => {
      const lineElement = document.querySelector(`[data-line-id="${lineId}"]`);
      if (lineElement && editorRef.current) {
        // Get the editor container bounds
        const editorRect = editorRef.current.getBoundingClientRect();
        const lineRect = lineElement.getBoundingClientRect();
        
        // Calculate the position relative to the editor container
        const relativeTop = lineRect.top - editorRect.top;
        const editorHeight = editorRect.height;
        const targetPosition = editorRef.current.scrollTop + relativeTop - (editorHeight / 2) + (lineRect.height / 2);
        
        // Smooth scroll within the editor container only
        editorRef.current.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Convert content to lines when content prop changes
  useEffect(() => {
    console.log('[StyledMarkdownEditor] Content prop changed:', content);
    console.log('[StyledMarkdownEditor] Current editingLineId:', editingLineId);
    console.log('[StyledMarkdownEditor] isUpdatingContent:', isUpdatingContent);
    
    // Don't recreate lines if we're in the middle of updating content
    if (isUpdatingContent) {
      console.log('[StyledMarkdownEditor] Skipping line recreation - updating content');
      setIsUpdatingContent(false);
      return;
    }
    
    try {
      const contentLines = content.split('\n');
      const newLines: LineData[] = contentLines.map((line, index) => ({
        id: `line-${index}`, // Use deterministic IDs based on line position
        rawMarkdown: line,
        isEditing: false
      }));
      console.log('[StyledMarkdownEditor] Setting new lines from content:', newLines.length);
      
      // Only update lines if they're actually different
      const currentContent = lines.map(l => l.rawMarkdown).join('\n');
      if (currentContent !== content) {
        setLines(newLines);
        
        // Clear editing state when content changes externally (not from our updates)
        if (editingLineId && !isUpdatingContent) {
          console.log('[StyledMarkdownEditor] Clearing editing state due to external content change');
          setEditingLineId(null);
          setEditingValue('');
        }
      }
    } catch (error) {
      console.error('[StyledMarkdownEditor] Error processing content:', error);
      // Fallback to empty state
      setLines([]);
    }
  }, [content, isUpdatingContent]);

  // Focus input and scroll into view when editing state changes
  useEffect(() => {
    if (editingLineId) {
      console.log('[StyledMarkdownEditor] Setting up focus for line:', editingLineId);
      // Small delay to ensure React has rendered the input
      const timer = setTimeout(() => {
        if (editingInputRef.current) {
          console.log('[StyledMarkdownEditor] Focusing input and scrolling into view');
          editingInputRef.current.focus();
          
          // Scroll the editing line into view
          scrollIntoView(editingLineId);
        } else {
          console.log('[StyledMarkdownEditor] Input ref not available');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editingLineId]);

  // Update content when lines change
  const updateContent = (newLines: LineData[]) => {
    try {
      console.log('[StyledMarkdownEditor] updateContent called with', newLines.length, 'lines');
      const newContent = newLines.map(line => line.rawMarkdown).join('\n');
      console.log('[StyledMarkdownEditor] New content:', newContent);
      
      // Set flag to prevent line recreation when content prop updates
      setIsUpdatingContent(true);
      onChange(newContent);
      
      // Process tasks if any were found
      if (onTasksFound) {
        const { tasks } = parseTasksFromContent(newContent);
        console.log('[StyledMarkdownEditor] Found', tasks.length, 'tasks');
        onTasksFound(tasks);
      }
    } catch (error) {
      console.error('[StyledMarkdownEditor] Error updating content:', error);
    }
  };

  // Parse markdown to styled elements
  const parseMarkdownLine = (markdown: string) => {
    if (!markdown.trim()) {
      return <div className="h-5 py-1">&nbsp;</div>; // Empty line with proper height
    }

    // Headers
    if (markdown.startsWith('### ')) {
      return <h3 className="text-xl font-bold py-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{markdown.slice(4)}</h3>;
    }
    if (markdown.startsWith('## ')) {
      return <h2 className="text-2xl font-bold py-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{markdown.slice(3)}</h2>;
    }
    if (markdown.startsWith('# ')) {
      return <h1 className="text-3xl font-bold py-3 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{markdown.slice(2)}</h1>;
    }

    // Tasks - handle with special care for IDs
    if (markdown.match(/^\s*-\s*\[[x\s]\]/)) {
      return parseTaskLine(markdown);
    }

    // Lists
    if (markdown.match(/^\s*-\s/)) {
      const indent = markdown.match(/^(\s*)/)?.[1]?.length || 0;
      const content = markdown.replace(/^\s*-\s/, '');
      return (
        <div className={`flex items-start py-1 ${indent > 0 ? `pl-${Math.min(Math.floor(indent/2), 8)}` : ''}`}>
          <span className="mr-2" style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: 'var(--text-primary)' }}>{parseInlineMarkdown(content)}</span>
        </div>
      );
    }

    // Code blocks
    if (markdown.startsWith('```')) {
      return <div className="p-2 rounded text-sm font-mono" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{markdown}</div>;
    }

    // Blockquotes
    if (markdown.startsWith('> ')) {
      return <blockquote className="border-l-4 pl-4 italic py-1" style={{ borderLeftColor: 'var(--accent-blue)', color: 'var(--text-secondary)' }}>{markdown.slice(2)}</blockquote>;
    }

    // Regular paragraph with inline formatting
    return <p className="py-1 leading-relaxed text-base" style={{ color: 'var(--text-primary)' }}>{parseInlineMarkdown(markdown)}</p>;
  };

  // Parse task line with checkbox and date
  const parseTaskLine = (markdown: string) => {
    const taskRegex = /^(\s*)-\s*\[([x\s])\]\s+(.+?)(\s*<!-- task-id:[^>]+ -->)?$/;
    const match = markdown.match(taskRegex);
    
    if (!match) {
      return <p style={{ color: 'var(--text-primary)' }}>{markdown}</p>;
    }

    const [, indent, checkState, taskContent, taskIdComment] = match;
    const indentLevel = indent?.length || 0;

    // Extract task ID from comment
    const taskIdMatch = taskIdComment?.match(/<!-- task-id:([^>]+) -->/);
    const taskId = taskIdMatch?.[1];
    
    // Use database status if available, otherwise fall back to markdown checkbox state
    const isCompleted = taskId && taskStatuses.hasOwnProperty(taskId) 
      ? taskStatuses[taskId] 
      : checkState.toLowerCase() === 'x';

    // Parse task content to separate text from date
    const dateMatch = taskContent.match(/^(.+?)(\s+@[\w\/]+)$/);
    const taskText = dateMatch ? dateMatch[1] : taskContent;
    const dateText = dateMatch ? dateMatch[2].trim() : null;

    return (
      <div className={`flex items-start py-1 ${indentLevel > 0 ? `pl-${Math.min(Math.floor(indentLevel/2), 8)}` : ''}`}>
        <TaskCheckbox
          checked={isCompleted}
          onChange={(checked) => {
            if (taskId && onTaskToggle) {
              onTaskToggle(taskId, checked);
            }
          }}
          size="md"
          className="mt-0.5 mr-2"
          disabled={readOnly}
        />
        <div className={`flex-1 ${isCompleted ? 'line-through' : ''}`} style={{ color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
          <span>{parseInlineMarkdown(taskText)}</span>
          {dateText && (
            <span 
              className="ml-2 px-2 py-0.5 text-xs rounded-full font-medium"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)', 
                color: 'var(--accent-blue)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {dateText}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Parse inline markdown (bold, italic, etc.)
  const parseInlineMarkdown = (text: string) => {
    // This is a simple parser - could be expanded
    let result = text;
    
    // Bold
    result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic  
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Code
    result = result.replace(/`([^`]+)`/g, '<code class="px-1 rounded text-sm" style="background-color: var(--bg-tertiary); color: var(--text-primary);">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  // Handle line click to enter edit mode
  const handleLineClick = (lineId: string) => {
    if (readOnly) return;
    const line = lines.find(l => l.id === lineId);
    if (line) {
      setEditingValue(line.rawMarkdown);
      setEditingLineId(lineId);
    }
  };

  // Handle line edit completion
  const handleLineEdit = (lineId: string, newMarkdown: string) => {
    const newLines = lines.map(line => 
      line.id === lineId ? { ...line, rawMarkdown: newMarkdown, isEditing: false } : line
    );
    setLines(newLines);
    updateContent(newLines);
    setEditingLineId(null);
    setEditingValue('');
  };

  // Handle key events in edit mode
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, lineId: string) => {
    console.log('[StyledMarkdownEditor] Key pressed:', e.key, 'on line:', lineId);
    
    if (e.key === 'Enter') {
      console.log('[StyledMarkdownEditor] Enter pressed - creating new line');
      e.preventDefault();
      e.stopPropagation();
      
      const input = e.currentTarget;
      console.log('[StyledMarkdownEditor] Current input value:', input.value);
      
      // Update current line and create new line in one operation
      const lineIndex = lines.findIndex(l => l.id === lineId);
      console.log('[StyledMarkdownEditor] Line index:', lineIndex);
      
      // Create new line with deterministic ID
      const newLine: LineData = {
        id: `line-${lineIndex + 1}`, // Next line index
        rawMarkdown: '',
        isEditing: false
      };
      console.log('[StyledMarkdownEditor] New line created:', newLine.id);
      
      const newLines = [
        ...lines.slice(0, lineIndex),
        { ...lines[lineIndex], rawMarkdown: input.value, isEditing: false },
        newLine,
        ...lines.slice(lineIndex + 1)
      ].map((line, index) => ({ ...line, id: `line-${index}` })); // Renumber all lines
      
      console.log('[StyledMarkdownEditor] Updating lines, new count:', newLines.length);
      setLines(newLines);
      updateContent(newLines);
      
      // Set up editing state for new line (it will be at the next index)
      const newLineId = `line-${lineIndex + 1}`;
      console.log('[StyledMarkdownEditor] Setting editing state for new line:', newLineId);
      setEditingValue('');
      setEditingLineId(newLineId);
      
      // Scroll new line into view
      scrollIntoView(newLineId);
    } else if (e.key === 'ArrowUp') {
      // Move to previous line
      e.preventDefault();
      const currentLineIndex = lines.findIndex(l => l.id === lineId);
      if (currentLineIndex > 0) {
        const input = e.currentTarget;
        // Save current line content
        const updatedLines = lines.map(line => 
          line.id === lineId ? { ...line, rawMarkdown: input.value } : line
        );
        setLines(updatedLines);
        updateContent(updatedLines);
        
        // Move to previous line
        const prevLineId = `line-${currentLineIndex - 1}`;
        const prevLine = updatedLines[currentLineIndex - 1];
        setEditingValue(prevLine.rawMarkdown);
        setEditingLineId(prevLineId);
        
        // Scroll into view
        scrollIntoView(prevLineId);
      }
    } else if (e.key === 'ArrowDown') {
      // Move to next line
      e.preventDefault();
      const currentLineIndex = lines.findIndex(l => l.id === lineId);
      if (currentLineIndex < lines.length - 1) {
        const input = e.currentTarget;
        // Save current line content
        const updatedLines = lines.map(line => 
          line.id === lineId ? { ...line, rawMarkdown: input.value } : line
        );
        setLines(updatedLines);
        updateContent(updatedLines);
        
        // Move to next line
        const nextLineId = `line-${currentLineIndex + 1}`;
        const nextLine = updatedLines[currentLineIndex + 1];
        setEditingValue(nextLine.rawMarkdown);
        setEditingLineId(nextLineId);
        
        // Scroll into view
        scrollIntoView(nextLineId);
      }
    } else if (e.key === 'Backspace') {
      // Handle backspace - if we're at the beginning of an empty line, merge with previous line
      const input = e.currentTarget;
      const currentLineIndex = lines.findIndex(l => l.id === lineId);
      
      // Only handle backspace if cursor is at the beginning and line is empty, or if the entire line is selected
      if ((input.selectionStart === 0 && input.value.trim() === '') || 
          (input.selectionStart === 0 && input.selectionEnd === input.value.length)) {
        
        if (currentLineIndex > 0) {
          e.preventDefault();
          
          // Get the previous line
          const prevLineIndex = currentLineIndex - 1;
          const prevLine = lines[prevLineIndex];
          const currentLineContent = input.value;
          
          // Merge current line content with previous line (if current line has content)
          const mergedContent = prevLine.rawMarkdown + currentLineContent;
          
          // Remove current line and update previous line
          const newLines = lines.filter((_, index) => index !== currentLineIndex)
            .map((line, index) => ({ ...line, id: `line-${index}` })); // Renumber lines
          
          // Update the previous line with merged content
          newLines[prevLineIndex] = {
            ...newLines[prevLineIndex],
            rawMarkdown: mergedContent
          };
          
          console.log('[StyledMarkdownEditor] Backspace: merging lines, new count:', newLines.length);
          setLines(newLines);
          updateContent(newLines);
          
          // Move to the previous line and position cursor at the end of original content
          const prevLineId = `line-${prevLineIndex}`;
          setEditingValue(mergedContent);
          setEditingLineId(prevLineId);
          
          // Scroll into view and set cursor position
          scrollIntoView(prevLineId);
          setTimeout(() => {
            if (editingInputRef.current) {
              const cursorPosition = prevLine.rawMarkdown.length;
              editingInputRef.current.setSelectionRange(cursorPosition, cursorPosition);
            }
          }, 100);
        }
      }
    } else if (e.key === 'Escape') {
      console.log('[StyledMarkdownEditor] Escape pressed - exiting edit mode');
      setEditingLineId(null);
      setEditingValue('');
    }
  };

  // Handle click below last line to create new line
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly) return;
    
    const target = e.target as HTMLElement;
    
    // Handle empty editor case
    if (lines.length === 0) {
      console.log('[StyledMarkdownEditor] Click on empty editor - creating first line');
      const newLine: LineData = {
        id: `line-0`,
        rawMarkdown: '',
        isEditing: false
      };
      setLines([newLine]);
      setEditingValue('');
      setEditingLineId('line-0');
      
      // Scroll to the first line
      scrollIntoView('line-0');
      return;
    }
    
    // Only handle clicks on the container div itself or its placeholder, not on line elements
    if (target === editorRef.current || target.closest('.text-gray-500')) {
      console.log('[StyledMarkdownEditor] Click detected below content');
      
      // Check if the last line is already blank
      const lastLine = lines[lines.length - 1];
      if (lastLine && lastLine.rawMarkdown.trim() === '') {
        // Don't add a new line, just start editing the existing blank line
        console.log('[StyledMarkdownEditor] Last line is already blank - editing it instead');
        setEditingValue(lastLine.rawMarkdown);
        setEditingLineId(lastLine.id);
        
        // Scroll to the existing blank line
        scrollIntoView(lastLine.id);
      } else {
        // Create new line at the end
        console.log('[StyledMarkdownEditor] Creating new line at the end');
        const newLineIndex = lines.length;
        const newLine: LineData = {
          id: `line-${newLineIndex}`,
          rawMarkdown: '',
          isEditing: false
        };
        
        const newLines = [...lines, newLine];
        setLines(newLines);
        updateContent(newLines);
        
        // Start editing the new line
        const newLineId = `line-${newLineIndex}`;
        setEditingValue('');
        setEditingLineId(newLineId);
        
        // Scroll to the new line
        scrollIntoView(newLineId);
      }
    }
  };

  return (
    <div 
      ref={editorRef}
      className={`${className} cursor-text overflow-y-auto focus:outline-none styled-scrollbar font-serif`}
      onClick={handleEditorClick}
      tabIndex={readOnly ? -1 : 0}
      onKeyDown={readOnly ? undefined : (e) => {
        // Handle page up/down for scrolling
        if (e.key === 'PageUp' || e.key === 'PageDown') {
          // Let the browser handle page scrolling
          return;
        }
        // Handle other global editor shortcuts if needed
        if (e.key === 'Escape' && editingLineId) {
          setEditingLineId(null);
          setEditingValue('');
        }
      }}
      onWheel={(e) => {
        // Prevent scroll events from bubbling up to parent containers
        e.stopPropagation();
      }}
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
      }}
    >
      <div className="p-4 pb-16 min-h-full">
        {lines.length === 0 ? (
          <div className="italic" style={{ color: 'var(--text-muted)' }}>
            {placeholder}
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="group relative" data-line-id={line.id}>
              {editingLineId === line.id ? (
                <div className="rounded px-1 -mx-1 border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--accent-blue)' }}>
                  <input
                    ref={editingInputRef}
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onBlur={(e) => handleLineEdit(line.id, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, line.id)}
                    className="w-full bg-transparent border-none outline-none font-serif text-base py-1"
                    style={{ color: 'var(--text-primary)' }}
                    placeholder="Type here..."
                  />
                </div>
              ) : (
                <div 
                  onClick={() => handleLineClick(line.id)}
                  className="rounded px-1 -mx-1 cursor-text"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {parseMarkdownLine(line.rawMarkdown)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}