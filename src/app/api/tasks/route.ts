import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTasksForDateRange, getAllTasks, getTasksByFolder } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const folderId = searchParams.get('folderId');

  try {
    if (startDate && endDate) {
      // Get tasks for date range
      const tasks = await getTasksForDateRange(new Date(startDate), new Date(endDate));
      return NextResponse.json(tasks);
    } else if (folderId !== null) {
      // Get tasks by folder (support 'folderId=' or 'folderId=123')
      const tasks = await getTasksByFolder(folderId);
      return NextResponse.json(tasks); 
    } else {
      // Get all tasks
      const tasks = await getAllTasks();
      return NextResponse.json(tasks);
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a request to fetch tasks by IDs
    if (body.taskIds && Array.isArray(body.taskIds)) {
      // Filter out null/undefined task IDs
      const validTaskIds = body.taskIds.filter(id => id != null && id !== '');
      
      if (validTaskIds.length === 0) {
        console.log('[API] No valid task IDs provided:', body.taskIds);
        return NextResponse.json([]);
      }
      
      // Fetch tasks by IDs
      const { getTasksByIds } = await import('@/lib/api');
      const tasks = await getTasksByIds(validTaskIds);
      return NextResponse.json(tasks);
    }
    
    
    // Otherwise, handle task creation
    const { content, dueDate, noteId } = body;
    
    if (content === undefined || content === null) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    let task;
    if (noteId) {
        // If noteId is provided, we use the specific function to link it
        const { createTaskFromNote } = await import('@/lib/api');
        task = await createTaskFromNote(noteId, content, dueDate ? new Date(dueDate) : undefined);
    } else {
        task = await createTask(content, dueDate ? new Date(dueDate) : undefined);
    }
// ... POST handler ...
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error handling task request:', error);
    return NextResponse.json({ error: 'Failed to process task request' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (status === 'completed') {
     try {
       const { deleteCompletedTasks } = await import('@/lib/api');
       await deleteCompletedTasks();
       return NextResponse.json({ success: true });
     } catch (error) {
        console.error('Error deleting completed tasks:', error);
        return NextResponse.json({ error: 'Failed to delete tasks' }, { status: 500 });
     }
  }

  return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
}