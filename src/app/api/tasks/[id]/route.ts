import { NextRequest, NextResponse } from 'next/server';
import { updateTask, deleteTask, markTaskCompleted } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { content, dueDate, completed } = await request.json();
    const { id: taskId } = await params;
    
    const updates: any = {};
    if (content !== undefined) updates.content = content;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
    if (completed !== undefined) updates.completed = completed;
    
    const task = await updateTask(taskId, updates);
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    await deleteTask(taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { completed } = await request.json();
    const { id: taskId } = await params;
    
    if (completed) {
      await markTaskCompleted(taskId);
    } else {
      await updateTask(taskId, { completed: false });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task completion:', error);
    return NextResponse.json({ error: 'Failed to update task completion' }, { status: 500 });
  }
}