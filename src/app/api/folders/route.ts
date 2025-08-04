import { NextRequest, NextResponse } from 'next/server';
import { getFolders, createFolder } from '@/lib/api';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, parentId } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const folder = await createFolder(name, parentId);
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}