import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTasksForDateRange, getAllTasks } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    if (startDate && endDate) {
      // Get tasks for date range
      const tasks = await getTasksForDateRange(new Date(startDate), new Date(endDate));
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
      // Fetch tasks by IDs
      const { getTasksByIds } = await import('@/lib/api');
      const tasks = await getTasksByIds(body.taskIds);
      return NextResponse.json(tasks);
    }
    
    // Otherwise, handle task creation
    const { content, dueDate } = body;
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    const task = await createTask(content, dueDate ? new Date(dueDate) : undefined);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error handling task request:', error);
    return NextResponse.json({ error: 'Failed to process task request' }, { status: 500 });
  }
}