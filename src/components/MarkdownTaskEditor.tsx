'use client';

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { ParsedTask, parseTasksFromContent } from '@/lib/taskParser';

interface MarkdownTaskEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTasksFound?: (tasks: ParsedTask[]) => void;
  onTaskToggle?: (taskId: string, completed: boolean) => void;
  placeholder?: string;
  className?: string;
  noteId?: string;
}

export default function MarkdownTaskEditor({
  content,
  onChange,
  onTasksFound,
  onTaskToggle,
  placeholder = 'Start writing...',
  className = '',
  noteId
}: MarkdownTaskEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentTasks, setCurrentTasks] = useState<ParsedTask[]>([]);
  const previousTasksRef = useRef<ParsedTask[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  
  // Undo/Redo history
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Parse tasks whenever content changes
  useEffect(() => {
    const { tasks } = parseTasksFromContent(content);
    setCurrentTasks(tasks);
    
    // Check if tasks were deleted (fewer tasks than before)
    const previousTasks = previousTasksRef.current;
    if (previousTasks.length > tasks.length) {
      console.log('[MarkdownTaskEditor] Tasks were deleted, updating database');
      if (onTasksFound) {
        onTasksFound(tasks);
      }
    }
    
    previousTasksRef.current = tasks;
  }, [content, onTasksFound]);

  // Update history when content changes from outside (like loading a note)
  useEffect(() => {
    if (content !== history[historyIndex]) {
      setHistory([content]);
      setHistoryIndex(0);
    }
  }, [content]); // Only depend on content, not history state

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Undo/Redo
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (e.key === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
    }
    
    // Handle Ctrl+Shift+Z as redo (common alternative)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      handleRedo();
      return;
    }
    
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      const lines = textarea.value.split('\n');
      
      // Find which line the cursor is on
      let currentLineIndex = 0;
      let currentPosition = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (currentPosition + lines[i].length >= selectionStart) {
          currentLineIndex = i;
          break;
        }
        currentPosition += lines[i].length + 1; // +1 for newline
      }
      
      const currentLine = lines[currentLineIndex];
      console.log('[MarkdownTaskEditor] Enter pressed on line:', currentLine);
      
      // Check if current line is a task pattern
      const taskPattern = /^\s*-\s*\[([x\s])\]\s+(.+?)(?:\s+@(\w+|\d{4}-\d{2}-\d{2}))?(?:\s*<!-- task-id:[^>]+ -->)*$/;
      const match = currentLine.match(taskPattern);
      
      if (match) {
        console.log('[MarkdownTaskEditor] Task pattern detected:', match);
        
        const [fullMatch, checkboxState, taskContentRaw, dateString] = match;
        
        // Clean task content by removing any existing task ID comments
        const taskContent = taskContentRaw.replace(/\s*<!-- task-id:[^>]+ -->/g, '').trim();
        
        if (taskContent) {
          // Check if task already has an ID
          const existingIdMatch = currentLine.match(/<!-- task-id:([^>]+) -->/);
          
          if (existingIdMatch) {
            // Task already has an ID, just add a new line
            e.preventDefault();
            lines.splice(currentLineIndex + 1, 0, '');
            const newContent = lines.join('\n');
            onChange(newContent);
            
            setTimeout(() => {
              const newLinePosition = currentPosition + currentLine.length + 1;
              textarea.setSelectionRange(newLinePosition, newLinePosition);
              textarea.focus();
            }, 10);
          } else {
            // Create a UUID for the new task
            const taskId = globalThis.crypto?.randomUUID() || Math.random().toString(36).substring(2) + Date.now().toString(36);
            
            // Prevent default Enter behavior first
            e.preventDefault();
            
            // Calculate cursor position for new line
            const commentToAdd = ` <!-- task-id:${taskId} -->`;
            const updatedLine = `${currentLine}${commentToAdd}`;
            
            // Insert the updated line and a new empty line
            lines[currentLineIndex] = updatedLine;
            lines.splice(currentLineIndex + 1, 0, '');
            
            const newContent = lines.join('\n');
            
            // Update content
            onChange(newContent);
            
            // Set cursor position on the new line
            setTimeout(() => {
              const newLinePosition = currentPosition + currentLine.length + commentToAdd.length + 1;
              textarea.setSelectionRange(newLinePosition, newLinePosition);
              textarea.focus();
            }, 10);
            
            // Process ALL tasks in the content to ensure database consistency
            if (onTasksFound) {
              setTimeout(() => {
                const { parseTasksFromContent } = require('@/lib/taskParser');
                const { tasks } = parseTasksFromContent(newContent);
                console.log('[MarkdownTaskEditor] Processing all tasks after new task creation:', tasks);
                onTasksFound(tasks);
              }, 50);
            }
          }
          
          return;
        }
      }
    }
    
    // Handle Delete/Backspace for task deletion
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const { selectionStart } = textarea;
      
      // Check if we're deleting a line with a task
      const lines = textarea.value.split('\n');
      let currentLineIndex = 0;
      let currentPosition = 0;
      
      for (let i = 0; i < lines.length; i++) {
        if (currentPosition + lines[i].length >= selectionStart) {
          currentLineIndex = i;
          break;
        }
        currentPosition += lines[i].length + 1;
      }
      
      const currentLine = lines[currentLineIndex];
      const taskMatch = currentLine.match(/<!-- task-id:([^>]+) -->/);
      
      if (taskMatch) {
        console.log('[MarkdownTaskEditor] Deleting line with task:', taskMatch[1]);
        // The useEffect will detect the task deletion automatically
      }
    }
    
    // Handle tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;
      const tabCharacter = '  '; // 2 spaces
      
      if (e.shiftKey) {
        // Remove indentation
        const beforeCursor = textarea.value.substring(0, selectionStart);
        const afterCursor = textarea.value.substring(selectionEnd);
        const lines = beforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];
        
        if (currentLine.startsWith(tabCharacter)) {
          const newLine = currentLine.substring(tabCharacter.length);
          lines[lines.length - 1] = newLine;
          const newContent = lines.join('\n') + afterCursor;
          onChange(newContent);
          
          setTimeout(() => {
            const newPosition = selectionStart - tabCharacter.length;
            textarea.setSelectionRange(newPosition, newPosition);
          }, 0);
        }
      } else {
        // Add indentation
        const newContent = textarea.value.substring(0, selectionStart) + 
                          tabCharacter + 
                          textarea.value.substring(selectionEnd);
        onChange(newContent);
        
        setTimeout(() => {
          const newPosition = selectionStart + tabCharacter.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    // Add to history if content is different
    if (newContent !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift();
      } else {
        setHistoryIndex(prev => prev + 1);
      }
      
      setHistory(newHistory);
    }
    
    onChange(newContent);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  // Handle clicking on checkboxes in the rendered preview
  const handleCheckboxClick = (taskId: string, completed: boolean) => {
    if (onTaskToggle) {
      onTaskToggle(taskId, completed);
    }
    
    // Update the content to reflect the checkbox change
    const lines = content.split('\n');
    const updatedLines = lines.map(line => {
      if (line.includes(`<!-- task-id:${taskId} -->`)) {
        if (completed) {
          return line.replace(/- \[ \]/, '- [x]');
        } else {
          return line.replace(/- \[x\]/, '- [ ]');
        }
      }
      return line;
    });
    
    onChange(updatedLines.join('\n'));
  };

  // Handle deleting a task
  const handleTaskDelete = async (taskId: string) => {
    console.log('[MarkdownTaskEditor] Delete button clicked for task:', taskId);
    
    if (!confirm('Delete this task?')) {
      return;
    }
    
    console.log('[MarkdownTaskEditor] Confirmed deletion, removing task:', taskId);
    
    // Remove the task line from content
    const lines = content.split('\n');
    console.log('[MarkdownTaskEditor] Current lines:', lines);
    
    const updatedLines = lines.filter(line => !line.includes(`<!-- task-id:${taskId} -->`));
    console.log('[MarkdownTaskEditor] Updated lines after filter:', updatedLines);
    
    const newContent = updatedLines.join('\n');
    
    // Update content first
    onChange(newContent);
    
    // Then notify parent about the updated tasks (this will trigger API cleanup)
    if (onTasksFound) {
      const { tasks } = parseTasksFromContent(newContent);
      console.log('[MarkdownTaskEditor] Notifying parent about remaining tasks:', tasks);
      onTasksFound(tasks);
    }
  };


  // Update textarea when content prop changes
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== content) {
      const cursorPosition = textareaRef.current.selectionStart;
      textareaRef.current.value = content;
      // Preserve cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
      }, 0);
    }
  }, [content]);

  return (
    <div className={`relative ${className} ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full h-full p-4 resize-none outline-none border-0 bg-transparent"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}