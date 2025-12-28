import { format, addDays, parse, isValid, endOfWeek, endOfMonth } from 'date-fns';

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
  today.setHours(12, 0, 0, 0); // Reset time to Noon to avoid timezone shifts
  
  // Remove "due" or "@" prefix if present
  const cleanDateStr = dateString.replace(/^(?:@|due\s+)/i, '').toLowerCase().trim();

  // Basic relative dates
  if (cleanDateStr === 'today' || cleanDateStr === 'tod') return today;
  if (cleanDateStr === 'tomorrow' || cleanDateStr === 'tom') return addDays(today, 1);
  if (cleanDateStr === 'yesterday') return addDays(today, -1);
  
  // End of...
  if (cleanDateStr === 'end of week') return endOfWeek(today, { weekStartsOn: 1 }); // Monday start
  if (cleanDateStr === 'end of month') return endOfMonth(today);

  // "In X days" format
  const inDaysMatch = cleanDateStr.match(/^in\s+(\d+)\s+days?$/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1]);
    return addDays(today, days);
  }

  // Day names (monday, mon, next friday, etc.)
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  // Check for "next [day]" or just "[day]"
  const nextMatch = cleanDateStr.match(/^(?:next\s+)?([a-z]+)$/);
  if (nextMatch) {
    const dayName = nextMatch[1];
    let dayIndex = daysOfWeek.indexOf(dayName);
    if (dayIndex === -1) dayIndex = shortDays.indexOf(dayName);
    
    if (dayIndex !== -1) {
      let resultDate = new Date(today);
      resultDate.setDate(today.getDate() + (dayIndex + 7 - today.getDay()) % 7);
      
      if (cleanDateStr.startsWith('next ')) {
         if (resultDate.getTime() === today.getTime()) {
            resultDate = addDays(resultDate, 7);
         } else if (resultDate < today) {
            resultDate = addDays(resultDate, 7);
         } else {
           if (resultDate.getTime() - today.getTime() < 7 * 24 * 60 * 60 * 1000) {
              resultDate = addDays(resultDate, 7);
           }
         }
      } else {
        if (resultDate < today) {
           resultDate = addDays(resultDate, 7);
        }
      }
      return resultDate;
    }
  }

  // Try to parse as YYYY-MM-DD
  const dateMatch = cleanDateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isValid(parsedDate) ? parsedDate : null;
  }
  
  // Try other common formats
  try {
    const parsedDate = parse(cleanDateStr, 'yyyy-MM-dd', new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch {
    return null;
  }
}

// Extract date/content from a single line
export function extractDateFromContent(cleanLineContent: string): { content: string, date: Date | null, dateString: string | null } {
  // Regex to capture multi-word dates like @next friday, due next friday, end of week
  // Capture groups:
  // 1. "@" + date
  // 2. "due " + date
  const dateRegex = /(\s+(?:@|due\s+)(?:(\d{4}-\d{2}-\d{2})|(in\s+\d+\s+days?)|(end\s+of\s+(?:week|month))|(next\s+[a-zA-Z]+)|([a-zA-Z]+)))(?=\s|$)/i;
  const dateMatch = cleanLineContent.match(dateRegex);
    
  let content = cleanLineContent;
  let dateString = null;

  if (dateMatch) {
    // If date is found, content is everything before it
    content = cleanLineContent.slice(0, dateMatch.index).trim();
    // Group 1 is the full string including space, so trim it
    dateString = dateMatch[0].trim(); 
  } else {
    content = cleanLineContent.trim();
  }
  
  const date = dateString ? parseTaskDate(dateString) : null;
  
  return { content, date, dateString };
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
    
    // Parse date using shared helper
    const extraction = extractDateFromContent(cleanLineContent);
    const taskContent = extraction.content;
    const dateString = extraction.dateString;
    const parsedDate = extraction.date;
    const displayDateString = parsedDate ? formatTaskDateForDisplay(parsedDate) : dateString;
    
    if (!taskContent) continue; // Skip empty tasks
    
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
export function isTaskOverdue(task: { dueDate: Date | null, completed: boolean }): boolean {
  if (!task.dueDate || task.completed) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(task.dueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  return dueDate < today;
}
