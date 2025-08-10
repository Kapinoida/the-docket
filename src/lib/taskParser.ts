import { format, addDays, parse, isValid } from 'date-fns';

export interface ParsedTask {
  id: string; // Unique identifier for the task in the note
  content: string; // Task description
  completed: boolean; // Whether the task is completed
  dueDate: Date | null; // Parsed due date
  dateString: string | null; // Original date string (@today, @tomorrow, etc.)
  startIndex: number; // Position in the original text
  endIndex: number; // End position in the original text
  fullMatch: string; // The complete matched string
}

export interface TaskParsingResult {
  tasks: ParsedTask[];
  processedContent: string; // Content with task IDs added
}

// Regex to match task syntax: - [ ] or - [x] followed by the rest of the line.
const TASK_REGEX = /^(\s*)-\s*\[([x\s])\]\s+(.*)$/gm;

// Generate a UUID for new tasks, or extract existing ID from task comment
function generateOrExtractTaskId(fullMatch: string): string {
  // Check if task already has an ID in a comment
  const existingIdMatch = fullMatch.match(/<!-- task-id:([^>]+) -->/);
  if (existingIdMatch) {
    return existingIdMatch[1];
  }
  
  // Generate new UUID for new tasks
  return globalThis.crypto?.randomUUID() || Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Parse date strings like @today, @tomorrow, @2024-12-25
// Format a date for display in tasks (MM/DD/YY format)
export function formatTaskDateForDisplay(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits
  return `${month}/${day}/${year}`;
}

export function parseTaskDate(dateString: string): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  switch (dateString.toLowerCase()) {
    case 'today':
      return today;
    case 'tomorrow':
      return addDays(today, 1);
    case 'yesterday':
      return addDays(today, -1);
    default:
      // Try to parse as YYYY-MM-DD
      const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return isValid(parsedDate) ? parsedDate : null;
      }
      
      // Try other common formats
      try {
        const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
        return isValid(parsedDate) ? parsedDate : null;
      } catch {
        return null;
      }
  }
}

// Extract tasks from note content
export function parseTasksFromContent(content: string): TaskParsingResult {
  const tasks: ParsedTask[] = [];
  let processedContent = content;
  let match;
  let offset = 0;

  // Reset regex lastIndex
  TASK_REGEX.lastIndex = 0;

  while ((match = TASK_REGEX.exec(content)) !== null) {
    const [fullMatch, indent, checkboxState, lineContent] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Manually parse task content and date from the line
    // Remove any existing task ID comments from the line content before parsing
    const cleanLineContent = lineContent.replace(/\s*<!-- task-id:[^>]+ -->/g, '').trim();
    
    const dateRegex = /(\s+@(\w+|\d{4}-\d{2}-\d{2}))(?=\s|$)/;
    const dateMatch = cleanLineContent.match(dateRegex);
    
    let taskContent;
    let dateString = null;

    if (dateMatch) {
      // If date is found, content is everything before it
      taskContent = cleanLineContent.slice(0, dateMatch.index).trim();
      dateString = dateMatch[2] || null;
    } else {
      // Otherwise, the whole line is content
      taskContent = cleanLineContent.trim();
    }

    if (!taskContent) continue; // Skip empty tasks

    const parsedDate = dateString ? parseTaskDate(dateString) : null;
    const displayDateString = parsedDate ? formatTaskDateForDisplay(parsedDate) : dateString;
    
    const task: ParsedTask = {
      id: generateOrExtractTaskId(fullMatch),
      content: taskContent,
      completed: checkboxState.toLowerCase() === 'x',
      dueDate: parsedDate,
      dateString: dateString, // Keep original input for reference
      startIndex: startIndex + offset,
      endIndex: endIndex + offset,
      fullMatch
    };

    tasks.push(task);

    // Insert task ID as a data attribute in the processed content
    // Use the resolved date format for display (e.g., @today becomes @08/07/25)
    const replacement = `${indent}- [${checkboxState}] ${taskContent}${displayDateString ? ` @${displayDateString}` : ''} <!-- task-id:${task.id} -->`;
    
    processedContent = processedContent.slice(0, startIndex + offset) + 
                     replacement + 
                     processedContent.slice(endIndex + offset);
    
    // Adjust offset for the added content
    offset += replacement.length - fullMatch.length;
  }

  return {
    tasks,
    processedContent
  };
}

// Update task completion status in note content
export function updateTaskInContent(content: string, taskId: string, completed: boolean): string {
  // Find the task by its ID comment
  const taskCommentRegex = new RegExp(`<!-- task-id:${taskId} -->`, 'g');
  const match = taskCommentRegex.exec(content);
  
  if (!match) {
    return content; // Task not found
  }

  // Find the checkbox before this comment
  const beforeComment = content.slice(0, match.index);
  const afterComment = content.slice(match.index);
  
  // Look backwards for the checkbox
  const checkboxRegex = /-\s*\[([x\s])\]/g;
  let lastCheckboxMatch;
  let checkboxMatch;
  
  // Reset and find all checkboxes before the comment
  checkboxRegex.lastIndex = 0;
  while ((checkboxMatch = checkboxRegex.exec(beforeComment)) !== null) {
    lastCheckboxMatch = checkboxMatch;
  }
  
  if (lastCheckboxMatch) {
    const checkboxStart = lastCheckboxMatch.index;
    const checkboxEnd = lastCheckboxMatch.index + lastCheckboxMatch[0].length;
    const newCheckbox = `- [${completed ? 'x' : ' '}]`;
    
    return beforeComment.slice(0, checkboxStart) + 
           newCheckbox + 
           beforeComment.slice(checkboxEnd) + 
           afterComment;
  }
  
  return content;
}

// Remove task ID comments from content for display
export function cleanTaskComments(content: string): string {
  return content.replace(/\s*<!-- task-id:[^>]+ -->/g, '');
}

// Format date for display
export function formatTaskDate(date: Date | null): string {
  if (!date) return '';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  
  const diffInDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Tomorrow';
  if (diffInDays === -1) return 'Yesterday';
  if (diffInDays > 1 && diffInDays <= 7) return `In ${diffInDays} days`;
  if (diffInDays < -1 && diffInDays >= -7) return `${Math.abs(diffInDays)} days ago`;
  
  return format(date, 'MMM d, yyyy');
}

// Check if a task is overdue
export function isTaskOverdue(task: ParsedTask): boolean {
  if (!task.dueDate || task.completed) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}
