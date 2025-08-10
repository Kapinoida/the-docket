"use client";

import { useState, useEffect, useRef } from "react";
import { Note } from "@/types";
import MarkdownTaskEditor from "./MarkdownTaskEditor";
import StyledMarkdownEditor from "./StyledMarkdownEditor";
import { ParsedTask } from "@/lib/taskParser";
import { Lock, Unlock, Type, Code } from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onClose: () => void;
  isInTab?: boolean;
}

export default function NoteEditor({
  note,
  onSave,
  onClose,
  isInTab = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [editorMode, setEditorMode] = useState<'markdown' | 'styled'>('markdown');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('[NoteEditor] Note prop changed, updating editor state:', {
      noteId: note.id,
      title: note.title,
      contentLength: note.content?.length || 0,
      updatedAt: note.updatedAt
    });
    
    setTitle(note.title);
    setContent(note.content);
    setHasChanges(false);

    // Load read-only state from localStorage
    const storedReadOnlyState = localStorage.getItem(`noteReadOnly-${note.id}`);
    if (storedReadOnlyState) {
      setIsReadOnly(JSON.parse(storedReadOnlyState));
    } else {
      setIsReadOnly(false);
    }

    // Load editor mode from localStorage
    const storedEditorMode = localStorage.getItem(`noteEditorMode-${note.id}`);
    if (storedEditorMode && (storedEditorMode === 'markdown' || storedEditorMode === 'styled')) {
      setEditorMode(storedEditorMode as 'markdown' | 'styled');
    } else {
      setEditorMode('markdown');
    }

    // Load existing task mappings from localStorage (legacy support)
    // TODO: Migrate to database-backed mapping system
    const storedTaskMap = localStorage.getItem(`taskMap-${note.id}`);
    if (storedTaskMap) {
      try {
        setTaskMap(JSON.parse(storedTaskMap));
        console.log(
          "[NoteEditor] Loaded task map for note:",
          JSON.parse(storedTaskMap)
        );
      } catch (error) {
        console.error("[NoteEditor] Error parsing stored task map:", error);
        setTaskMap({});
      }
    } else {
      setTaskMap({});
    }

    // Trigger task status refresh when note content changes (likely due to external task updates)
    setTaskRefreshTrigger(prev => prev + 1);
    console.log("[NoteEditor] Triggering task status refresh due to note update:", { noteId: note.id, updatedAt: note.updatedAt });
  }, [note.id, note.title, note.content, note.updatedAt]);

  useEffect(() => {
    setHasChanges(title !== note.title || content !== note.content);
  }, [title, content, note]);

  useEffect(() => {
    // Focus title input when editor opens
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  // Simplified - content is always plain text/markdown now
  const getTextContent = () => content;

  const toggleReadOnly = () => {
    const newReadOnlyState = !isReadOnly;
    setIsReadOnly(newReadOnlyState);
    localStorage.setItem(`noteReadOnly-${note.id}`, JSON.stringify(newReadOnlyState));
  };

  const toggleEditorMode = () => {
    const newMode = editorMode === 'markdown' ? 'styled' : 'markdown';
    setEditorMode(newMode);
    localStorage.setItem(`noteEditorMode-${note.id}`, newMode);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the note");
      return;
    }

    setIsSaving(true);
    try {
      // Use the current content as-is - task IDs should already be embedded
      // from the MarkdownTaskEditor when tasks were created
      console.log("[NoteEditor] Saving note with current content...");
      
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
        onSave(updatedNote);
        setHasChanges(false);
      } else {
        alert("Failed to save note");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Error saving note");
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleTasksFound = async (tasks: ParsedTask[]) => {
    console.log(
      "[NoteEditor] Processing",
      tasks.length,
      "new tasks with UUIDs..."
    );
    setParsedTasks(tasks);

    // Send new tasks to API for database creation
    try {
      const response = await fetch("/api/tasks/from-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          noteId: note.id,
          existingTaskMap: taskMap,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[NoteEditor] ✅ Tasks processed:`, {
          created: result.tasksCreated,
          updated: result.tasksUpdated,
          deleted: result.tasksDeleted,
        });

        // Update and persist the task map (legacy support for now)
        if (result.taskMap) {
          setTaskMap(result.taskMap);
          localStorage.setItem(
            `taskMap-${note.id}`,
            JSON.stringify(result.taskMap)
          );
        }
      } else {
        console.error(
          "[NoteEditor] API response not ok:",
          response.status,
          await response.text()
        );
      }
    } catch (error) {
      console.error("[NoteEditor] Error processing tasks from note:", error);
    }
  };

  const handleManualTaskProcessing = async () => {
    console.log("[NoteEditor] Manual task processing triggered");
    const { parseTasksFromContent } = await import("@/lib/taskParser");
    const textContent = getTextContent();
    const { tasks } = parseTasksFromContent(textContent);
    await handleTasksFound(tasks);
  };

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      let dbTaskId: string;
      
      // Check if taskId is already a database task ID (from StyledMarkdownEditor)
      // or if it's an inline UUID that needs mapping (from MarkdownTaskEditor)
      if (taskMap[taskId]) {
        // This is an inline UUID, use mapping
        dbTaskId = taskMap[taskId];
        console.log("[NoteEditor] Using mapped task ID:", { inlineId: taskId, dbTaskId });
      } else {
        // Assume this is already a database task ID (from StyledMarkdownEditor HTML comments)
        dbTaskId = taskId;
        console.log("[NoteEditor] Using direct task ID:", { dbTaskId });
      }

      const response = await fetch("/api/tasks/from-note", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: dbTaskId, // Use database task ID
          completed,
          noteId: note.id,
        }),
      });

      if (response.ok) {
        console.log(
          `[NoteEditor] Task ${dbTaskId} (inline: ${taskId}) marked as ${
            completed ? "completed" : "incomplete"
          }`
        );
        
        // Trigger task status refresh for styled editor
        setTaskRefreshTrigger(prev => prev + 1);
      } else {
        console.error(
          "[NoteEditor] Failed to toggle task:",
          response.status,
          await response.text()
        );
        alert("Failed to update task. Please try again.");
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
      } else if (e.key === "t") {
        e.preventDefault();
        handleManualTaskProcessing();
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
              onClick={toggleEditorMode}
              className="px-2 py-1 text-sm rounded transition-colors flex items-center gap-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-700"
              title={editorMode === 'styled' ? 'Switch to markdown editor' : 'Switch to styled editor'}
            >
              {editorMode === 'styled' ? <Code className="w-3 h-3" /> : <Type className="w-3 h-3" />}
              {editorMode === 'styled' ? 'Styled' : 'Markdown'}
            </button>
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
              onClick={handleSave}
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`text-xs px-2 py-1 rounded ${
                editorMode === 'styled' 
                  ? 'bg-purple-100 dark:bg-purple-700 text-purple-600 dark:text-purple-300'
                  : 'bg-green-100 dark:bg-green-700 text-green-600 dark:text-green-300'
              }`}>
                {editorMode === 'styled' ? 'Styled Editor' : 'Markdown Editor'}
              </div>

              {parsedTasks.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {parsedTasks.length} task{parsedTasks.length !== 1 ? "s" : ""}{" "}
                  found
                </div>
              )}

              {!isReadOnly && (
                <button
                  onClick={handleManualTaskProcessing}
                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-600"
                  title="Process tasks manually"
                >
                  Process Tasks
                </button>
              )}
            </div>
          </div>

          {editorMode === 'styled' ? (
            <StyledMarkdownEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your note... Use - [ ] for tasks"
              className="h-full border border-gray-200 dark:border-gray-700 rounded-lg"
              noteId={note.id}
              onTasksFound={handleTasksFound}
              onTaskToggle={handleTaskToggle}
              readOnly={isReadOnly}
              refreshTrigger={taskRefreshTrigger}
              taskMap={taskMap}
            />
          ) : (
            <MarkdownTaskEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your note... Use - [ ] for tasks"
              className="h-full border border-gray-200 dark:border-gray-700 rounded-lg"
              noteId={note.id}
              onTasksFound={handleTasksFound}
              onTaskToggle={handleTaskToggle}
              readOnly={isReadOnly}
            />
          )}
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
