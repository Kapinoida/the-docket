'use client';

import { useState, useEffect } from 'react';
import { Note } from '@/types';

interface NoteListProps {
  folderId: string;
  onNoteSelect?: (note: Note) => void;
  onNewNote?: () => void;
  refreshTrigger?: number; // Increment this to trigger a refresh
  onNotesChange?: (notes: Note[]) => void; // Callback when notes change
}

interface NoteItemProps {
  note: Note;
  onSelect: (note: Note) => void;
  onDelete: (note: Note) => void;
}

function NoteItem({ note, onSelect, onDelete }: NoteItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${note.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete(note);
      } else {
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note');
    } finally {
      setIsDeleting(false);
    }
  };

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={() => onSelect(note)} className="flex-1">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {note.title}
          </h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
              title="Delete note"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"
                  clipRule="evenodd"
                />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
        
        {note.content && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
            {truncateContent(note.content)}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Updated {new Date(note.updatedAt).toLocaleDateString()}
          </span>
          <span>
            {new Date(note.updatedAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NoteList({ folderId, onNoteSelect, onNewNote, refreshTrigger, onNotesChange }: NoteListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [folderId, refreshTrigger]);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/notes?folderId=${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
        onNotesChange?.(data); // Notify parent of notes change
      } else {
        setError('Failed to fetch notes');
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      setError('Error fetching notes');
    } finally {
      setLoading(false);
    }
  };

  const handleNoteDelete = (deletedNote: Note) => {
    const updatedNotes = notes.filter(note => note.id !== deletedNote.id);
    setNotes(updatedNotes);
    onNotesChange?.(updatedNotes); // Notify parent of notes change
  };

  const handleCreateNote = async () => {
    const title = prompt('Enter note title:');
    if (!title?.trim()) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: '',
          folderId,
        }),
      });

      if (response.ok) {
        const newNote = await response.json();
        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        onNotesChange?.(updatedNotes); // Notify parent of notes change
        if (onNoteSelect) {
          onNoteSelect(newNote);
        }
      } else {
        alert('Failed to create note');
      }
    } catch (error) {
      console.error('Error creating note:', error);
      alert('Error creating note');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading notes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Notes ({notes.length})
        </h3>
        <button
          onClick={onNewNote || handleCreateNote}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No notes yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create your first note to get started with this folder.
          </p>
          <button
            onClick={onNewNote || handleCreateNote}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Note
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onSelect={(note) => onNoteSelect?.(note)}
              onDelete={handleNoteDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}