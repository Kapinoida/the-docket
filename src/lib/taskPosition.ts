import { Editor } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

interface TaskPosition {
  taskId: string;
  noteId: string;
  position: number; // Position in the document
  content: string; // Task content for reference
}

interface TaskMapping {
  noteId: string;
  tasks: TaskPosition[];
  lastUpdated: Date;
}

// Global task position cache
const taskMappings = new Map<string, TaskMapping>();

/**
 * Extract all task positions from a TipTap editor
 */
export const extractTaskPositions = (editor: Editor, noteId: string): TaskPosition[] => {
  const positions: TaskPosition[] = [];
  const doc = editor.state.doc;

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (node.type.name === 'taskWidget' && node.attrs.taskId) {
      positions.push({
        taskId: node.attrs.taskId,
        noteId,
        position: pos,
        content: '', // Will be filled by task sync
      });
    }
    return true;
  });

  return positions;
};

/**
 * Update task positions for a note
 */
export const updateTaskPositions = (editor: Editor, noteId: string): void => {
  const positions = extractTaskPositions(editor, noteId);
  
  taskMappings.set(noteId, {
    noteId,
    tasks: positions,
    lastUpdated: new Date(),
  });

  console.log(`[TaskPosition] Updated ${positions.length} task positions for note ${noteId}`);
};

/**
 * Get task positions for a note
 */
export const getTaskPositions = (noteId: string): TaskPosition[] => {
  const mapping = taskMappings.get(noteId);
  return mapping ? mapping.tasks : [];
};

/**
 * Find all notes that contain a specific task
 */
export const findNotesWithTask = (taskId: string): string[] => {
  const noteIds: string[] = [];
  
  for (const [noteId, mapping] of taskMappings) {
    if (mapping.tasks.some(pos => pos.taskId === taskId)) {
      noteIds.push(noteId);
    }
  }
  
  return noteIds;
};

/**
 * Remove task from all position mappings (when task is deleted)
 */
export const removeTaskFromMappings = (taskId: string): void => {
  for (const [noteId, mapping] of taskMappings) {
    const updatedTasks = mapping.tasks.filter(pos => pos.taskId !== taskId);
    
    if (updatedTasks.length !== mapping.tasks.length) {
      taskMappings.set(noteId, {
        ...mapping,
        tasks: updatedTasks,
        lastUpdated: new Date(),
      });
    }
  }
};

/**
 * Insert a task widget at the current cursor position
 */
export const insertTaskWidgetAtCursor = (
  editor: Editor, 
  taskId: string
): boolean => {
  return editor.commands.insertTaskWidget(taskId);
};

/**
 * Replace a markdown task with a task widget
 */
export const replaceMarkdownWithWidget = (
  editor: Editor,
  from: number,
  to: number,
  taskId: string
): boolean => {
  const transaction = editor.state.tr;
  
  // Delete the markdown task text
  transaction.delete(from, to);
  
  // Insert the task widget
  const taskWidget = editor.schema.nodes.taskWidget.create({
    taskId,
  });
  
  transaction.insert(from, taskWidget);
  
  // Apply the transaction
  editor.view.dispatch(transaction);
  
  return true;
};

/**
 * Find and replace all markdown tasks with widgets in an editor
 */
export const convertMarkdownTasksToWidgets = async (
  editor: Editor,
  noteId: string,
  onTaskCreate: (content: string, dueDate?: Date) => Promise<string>
): Promise<number> => {
  const doc = editor.state.doc;
  const taskRegex = /^(\s*)-\s*\[([x\s])\]\s+(.+)$/gm;
  let conversionsCount = 0;
  
  // Process from end to beginning to avoid position shifts
  const replacements: Array<{
    from: number;
    to: number;
    taskId: string;
    content: string;
    dueDate?: Date;
  }> = [];
  
  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.textContent) {
      const text = node.textContent;
      const matches = Array.from(text.matchAll(taskRegex));
      
      for (const match of matches.reverse()) {
        const [fullMatch, indent, checkboxState, taskContent] = match;
        const isCompleted = checkboxState.toLowerCase() === 'x';
        
        let existingTaskId: string | undefined;
        let cleanContent = taskContent;
        
        // Check for existing task ID
        const idMatch = taskContent.match(/<!-- task-id:([^>]+) -->/);
        if (idMatch) {
          existingTaskId = idMatch[1];
          cleanContent = taskContent.replace(idMatch[0], '').trim();
        }

        // Parse due date from task content
        const dateRegex = /(\s+@(\w+|\d{4}-\d{2}-\d{2}))(?=\s|$)/;
        const dateMatch = cleanContent.match(dateRegex);
        
        let finalContent = cleanContent;
        let dueDate: Date | undefined;
        
        if (dateMatch) {
          finalContent = cleanContent.replace(dateMatch[0], '').trim();
          // Parse the date (reuse existing parsing logic)
          const dateString = dateMatch[2];
          dueDate = parseDateString(dateString);
        }
        
        // Store replacement info
        const matchStart = match.index!;
        const matchEnd = matchStart + fullMatch.length;
        
        replacements.push({
          from: pos + 1 + matchStart,
          to: pos + 1 + matchEnd,
          taskId: existingTaskId || '', // Will be filled if empty
          content: finalContent,
          dueDate
        });
      }
    }
    return true;
  });
  
  // Create tasks and perform replacements
  for (const replacement of replacements) {
    try {
      let taskId = replacement.taskId;
      
      // If no existing ID, create a new task
      if (!taskId) {
         taskId = await onTaskCreate(replacement.content, replacement.dueDate);
      } else {
         console.log(`[TaskPosition] Preserving existing task ID: ${taskId}`);
      }
        
      // Replace with widget
      replaceMarkdownWithWidget(editor, replacement.from, replacement.to, taskId);
      conversionsCount++;
      
    } catch (error) {
      console.error('Failed to convert markdown task:', error);
    }
  }
  
  // Update position mappings
  updateTaskPositions(editor, noteId);
  
  return conversionsCount;
};

/**
 * Simple date parsing (reuse from existing parser)
 */
const parseDateString = (dateString: string): Date | undefined => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  switch (dateString.toLowerCase()) {
    case 'today':
      return today;
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    default:
      // Try to parse as YYYY-MM-DD
      const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return undefined;
  }
};

/**
 * Clear all task position mappings (for testing/cleanup)
 */
export const clearTaskMappings = (): void => {
  taskMappings.clear();
};