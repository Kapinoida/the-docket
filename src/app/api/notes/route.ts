import { NextRequest, NextResponse } from 'next/server';
import { createNote, getNotesByFolder, getAllNotes } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  try {
    if (folderId) {
      // Get notes for specific folder
      const notes = await getNotesByFolder(folderId);
      return NextResponse.json(notes);
    } else {
      // Get all notes
      const notes = await getAllNotes();
      return NextResponse.json(notes);
    }
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content, folderId } = await request.json();
    
    if (!title || !folderId) {
      return NextResponse.json({ error: 'Title and folderId are required' }, { status: 400 });
    }
    
    const note = await createNote(title, content || '', folderId);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}