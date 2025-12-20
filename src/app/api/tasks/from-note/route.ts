import { NextRequest, NextResponse } from 'next/server';
import { createTaskFromNote, markTaskCompleted, updateTask, deleteTask } from '@/lib/api';
import { ParsedTask } from '@/lib/taskParser';

export async function POST(request: NextRequest) {
  try {
    const { tasks, noteId, existingTaskMap = {} } = await request.json();
    
    console.log('[API] POST /api/tasks/from-note called with:', { 
      tasksCount: tasks?.length, 
      noteId,
      existingTaskMapKeys: Object.keys(existingTaskMap),
      tasks: tasks?.map((t: any) => ({ content: t.content, dueDate: t.dueDate, completed: t.completed, id: t.id }))
    });
    
    if (!Array.isArray(tasks) || !noteId) {
      console.log('[API] Invalid request - missing tasks array or noteId');
      return NextResponse.json({ error: 'Tasks array and noteId are required' }, { status: 400 });
    }
    
    const processedTasks = [];
    const updatedTaskMap = { ...existingTaskMap };
    
    for (const task of tasks as ParsedTask[]) {
      try {
        let existingDbTaskId = existingTaskMap[task.id];
        
        // If no mapping found, but task.id looks like a DB ID (numeric), try to use it directly
        // This handles cases where the note content has already been updated with DB IDs
        if (!existingDbTaskId && /^\d+$/.test(task.id)) {
          existingDbTaskId = task.id;
        }
        
        if (existingDbTaskId) {
          // Update existing task
          console.log(`[API] Updating existing task ${existingDbTaskId} (UUID: ${task.id}): "${task.content}"`);
          
          const updatedTask = await updateTask(existingDbTaskId, {
            content: task.content,
            dueDate: task.dueDate,
            completed: task.completed
          });
          
          if (updatedTask) {
            console.log(`[API] Task updated successfully:`, updatedTask);
            
            processedTasks.push({
              ...updatedTask,
              inlineTaskId: task.id,
              action: 'updated'
            });
            
            // Keep the mapping
            updatedTaskMap[task.id] = existingDbTaskId;
          } else {
            console.warn(`[API] Task ${existingDbTaskId} not found for update, creating new task`);
            // If update fails, create a new task
            const createdTask = await createTaskFromNote(
              noteId,
              task.content,
              task.dueDate || undefined
            );
            
            if (task.completed) {
              await markTaskCompleted(createdTask.id);
            }
            
            processedTasks.push({
              ...createdTask,
              inlineTaskId: task.id,
              action: 'created'
            });
            
            updatedTaskMap[task.id] = createdTask.id;
          }
        } else {
          // Create new task
          console.log(`[API] Creating new task (UUID: ${task.id}): "${task.content}" with due date: ${task.dueDate}`);
          
          const createdTask = await createTaskFromNote(
            noteId,
            task.content,
            task.dueDate || undefined
          );
          
          console.log(`[API] Task created successfully:`, createdTask);
          
          // If the task is already completed, mark it as such
          if (task.completed) {
            console.log(`[API] Marking task as completed: ${createdTask.id}`);
            await markTaskCompleted(createdTask.id);
          }
          
          processedTasks.push({
            ...createdTask,
            inlineTaskId: task.id,
            action: 'created'
          });
          
          // Add to mapping
          updatedTaskMap[task.id] = createdTask.id;
        }
      } catch (error) {
        console.error(`[API] Error processing task "${task.content}" (UUID: ${task.id}):`, error);
        // Continue with other tasks even if one fails
      }
    }
    
    // Clean up orphaned tasks (tasks that were removed from the note)
    const currentInlineTaskIds = new Set(tasks.map(t => t.id));
    const orphanedDbTaskIds = [];
    
    // Cast to Record<string, string> safely
    const existingTaskMapRecord = existingTaskMap as Record<string, string>;
    
    for (const [inlineId, dbTaskId] of Object.entries(existingTaskMapRecord)) {
      if (!currentInlineTaskIds.has(inlineId)) {
        console.log(`[API] Found orphaned task ${dbTaskId} (inline ID: ${inlineId})`);
        orphanedDbTaskIds.push(dbTaskId);
        delete updatedTaskMap[inlineId];
      }
    }
    
    // Delete orphaned tasks
    for (const dbTaskId of orphanedDbTaskIds) {
      try {
        await deleteTask(dbTaskId);
        console.log(`[API] Deleted orphaned task: ${dbTaskId}`);
      } catch (error) {
        console.error(`[API] Error deleting orphaned task ${dbTaskId}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      tasksProcessed: processedTasks.length,
      tasksCreated: processedTasks.filter(t => t.action === 'created').length,
      tasksUpdated: processedTasks.filter(t => t.action === 'updated').length,
      tasksDeleted: orphanedDbTaskIds.length,
      tasks: processedTasks,
      taskMap: updatedTaskMap
    });
  } catch (error) {
    console.error('Error processing tasks from note:', error);
    return NextResponse.json({ error: 'Failed to process tasks from note' }, { status: 500 });
  }
}

// Update task completion status from inline checkbox
export async function PUT(request: NextRequest) {
  try {
    const { taskId, completed, noteId } = await request.json();
    
    if (!taskId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'TaskId and completed status are required' }, { status: 400 });
    }
    
    // Update task completion status using the standard updateTask function
    console.log(`[API] Updating task ${taskId} completion status to ${completed}`);
    const updatedTask = await updateTask(taskId, { completed });
    
    if (updatedTask) {
      console.log(`[API] Task ${taskId} successfully updated:`, { completed: updatedTask.completed });
      return NextResponse.json({ 
        success: true, 
        task: updatedTask 
      });
    } else {
      console.error(`[API] Task ${taskId} not found for update`);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating task completion:', error);
    return NextResponse.json({ error: 'Failed to update task completion' }, { status: 500 });
  }
}