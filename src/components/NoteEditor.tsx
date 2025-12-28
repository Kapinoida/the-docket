"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Note } from "@/types";
import RichTextEditor from "./RichTextEditor";
import { ParsedTask } from "@/lib/taskParser";
import { Lock, Unlock } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
  isInTab?: boolean;
  scrollToTaskId?: string;
}

export default function NoteEditor({
  note,
  onSave,
  onClose,
  isInTab = false,
  scrollToTaskId,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const titleRef = useRef<HTMLInputElement>(null);
  
  // Debounce content changes to reduce processing overhead
  const debouncedContent = useDebounce(content, 1000);
  const debouncedTitle = useDebounce(title, 1000);

  // Track previous note ID to detect switching
  const prevNoteIdRef = useRef(note.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only reset editor state if we switched to a DIFFERENT note
    if (note.id !== prevNoteIdRef.current) {
      // console.log('[NoteEditor] Note ID changed, resetting editor:', note.id);
      setTitle(note.title);
      setContent(note.content);
      setHasChanges(false);
      prevNoteIdRef.current = note.id;
      
      // Load read-only state
      const storedReadOnlyState = localStorage.getItem(`noteReadOnly-${note.id}`);
      setIsReadOnly(storedReadOnlyState ? JSON.parse(storedReadOnlyState) : false);

      // Load task map
      const storedTaskMap = localStorage.getItem(`taskMap-${note.id}`);
      setTaskMap(storedTaskMap ? JSON.parse(storedTaskMap) : {});
    }
  }, [note.id, note.title, note.content]); // Keep dependencies but guard logic

  useEffect(() => {
    setHasChanges(title !== note.title || content !== note.content);
  }, [title, content, note]);

  // Autosave effect
  useEffect(() => {
    if (mounted && hasChanges && !isSaving && !isReadOnly) {
       handleSave({ silent: true });
    }
  }, [debouncedContent, debouncedTitle]); // dependencies (debounced values) trigger the save logic

  useEffect(() => {
    // Focus title input when editor opens
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  // Handle scrolling to task if requested
  useEffect(() => {
    if (scrollToTaskId && mounted) {
      console.log(`[NoteEditor] Requested scroll to task: ${scrollToTaskId}`);
      // Simple text search and scroll for now
      // This is a basic implementation - fully reliable scrolling would require
      // integration with the specific editor instance (TipTap or textarea)
      setTimeout(() => {
        // Try to find element with task-id attribute (for styled editor)
        const element = document.querySelector(`[data-task-id="${scrollToTaskId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-yellow-100', 'dark:bg-yellow-900/30', 'transition-colors', 'duration-1000');
          setTimeout(() => {
             element.classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
          }, 2000);
        }
      }, 500);
    }
  }, [scrollToTaskId, mounted]);

  // Simplified - content is always plain text/markdown now
  const getTextContent = () => content;

  const toggleReadOnly = () => {
    const newReadOnlyState = !isReadOnly;
    setIsReadOnly(newReadOnlyState);
    localStorage.setItem(`noteReadOnly-${note.id}`, JSON.stringify(newReadOnlyState));
  };

  // Force styled editor mode
  const editorMode = 'styled';

  const handleSave = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!title.trim()) {
      if (!options.silent) alert("Please enter a title for the note");
      return;
    }

    setIsSaving(true);
    try {
      console.log(`[NoteEditor] Saving note... ${options.silent ? '(Autosave)' : ''}`);
      
      // Since we are using Tiptap exclusively, content is already managed by it.
      // However, we still might want to ensure any legacy markdown in the content 
      // is processed if it hasn't been already (though RichTextEditor handles this on mount).
      // For saving, we just save the current Tiptap HTML content.
      
      const response = await fetch(`/api/notes/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(), 
        }),
      });

      if (response.ok) {
        const updatedNote = await response.json();
        onSave(updatedNote); // This updates the parent list, but we don't necessarily need to reset local state if autosaving?
        // Actually onSave usually updates the main app state.
        
        // Only reset hasChanges if we truly saved everything
        setHasChanges(false);
      } else {
        if (!options.silent) alert("Failed to save note");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      if (!options.silent) alert("Error saving note");
    } finally {
      setIsSaving(false);
    }
  }, [title, content, note.id, onSave]);

  const handleClose = () => {
    if (isInTab) {
      // In tab mode, don't close on unsaved changes, just show warning
      if (hasChanges) {
        alert("Please save your changes first");
        return;
      }
    } else {
      // In modal mode, ask for confirmation
      if (hasChanges) {
        if (
          !confirm("You have unsaved changes. Are you sure you want to close?")
        ) {
          return;
        }
      }
    }
    onClose();
  };

  // Deprecated but kept for compatibility with RichTextEditor props interface if needed, 
  // though RichTextEditor handles tasks mostly internally via extensions now.
  const handleTasksFound = async (tasks: ParsedTask[], contentToUpdate?: string): Promise<string> => {
    // This logic is largely handled by the Tiptap extensions now, 
    // but we keep it if RichTextEditor calls it for any reason.
    return contentToUpdate || content;
  };

  const handleManualTaskProcessing = useCallback(async () => {
    // No-op or trigger Tiptap command if available. 
    // Since we removed Markdown mode, manual parsing is less relevant as Tiptap does it live.
    console.log("[NoteEditor] Manual task processing is deprecated in Rich Text mode");
  }, []);

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch("/api/tasks/from-note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          completed,
          noteId: note.id,
        }),
      });

      if (response.ok) {
        console.log(`[NoteEditor] Task ${taskId} toggled: ${completed}`);
      } else {
        console.error("Failed to toggle task");
      }
    } catch (error) {
      console.error("[NoteEditor] Error updating task:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "s") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "w") {
        e.preventDefault();
        handleClose();
      }
    }
  };

  const containerClasses = isInTab
    ? "h-full flex flex-col bg-white dark:bg-gray-800"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";

  const editorClasses = isInTab
    ? "h-full flex flex-col"
    : "bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-5/6 mx-4 flex flex-col";

  return (
    <div className={containerClasses}>
      <div className={editorClasses}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              readOnly={isReadOnly}
              className={`text-xl font-semibold bg-transparent border-none outline-none flex-1 min-w-0 ${
                isReadOnly 
                  ? 'text-gray-600 dark:text-gray-400 cursor-default'
                  : 'text-gray-900 dark:text-white placeholder-gray-500'
              }`}
              placeholder="Note title..."
              onKeyDown={handleKeyDown}
            />
            {hasChanges && !isReadOnly && (
              <span className="text-sm text-orange-600 dark:text-orange-400 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleReadOnly}
              className={`px-3 py-1 text-sm rounded transition-colors flex items-center gap-1 ${
                isReadOnly 
                  ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-700'
                  : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700'
              }`}
              title={isReadOnly ? 'Switch to editing mode' : 'Switch to read-only mode'}
            >
              {isReadOnly ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {isReadOnly ? 'Read-only' : 'Editing'}
            </button>
            <button
              onClick={() => handleSave()}
              disabled={isSaving || !hasChanges || isReadOnly}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            {!isInTab && (
              <button
                onClick={handleClose}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Close
              </button>
            )}
          </div>
        </div>

        {/* Content Editor */}
        <div className="flex-1 p-4 overflow-hidden">
          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your note... Use - [ ] for tasks"
            className="h-full"
            noteId={note.id}
            onTasksFound={handleTasksFound}
            onTaskToggle={handleTaskToggle}
            readOnly={isReadOnly}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          {mounted && (
            <div>
              Created: {new Date(note.createdAt).toLocaleDateString()} at{" "}
              {new Date(note.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
          <div>
            {isReadOnly 
              ? 'Note is in read-only mode • Click editing button to enable editing'
              : 'Ctrl/Cmd + S to save • Ctrl/Cmd + W to close • Ctrl/Cmd + Z to undo • Ctrl/Cmd + Y to redo • Hover over tasks to delete'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
