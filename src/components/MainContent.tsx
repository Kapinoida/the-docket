'use client';

import { useState, useEffect } from 'react';
import { Folder, Note } from '@/types';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';

interface MainContentProps {
  selectedFolder: Folder | null;
  selectedNote?: Note | null;
  onNotesChange?: () => void;
}

export default function MainContent({ selectedFolder, selectedNote, onNotesChange }: MainContentProps) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Open editor when a note is selected from sidebar or note list
  useEffect(() => {
    if (selectedNote) {
      setEditingNote(selectedNote);
    }
  }, [selectedNote]);

  const handleNoteSelect = (note: Note) => {
    setEditingNote(note);
  };

  const handleNoteSave = (updatedNote: Note) => {
    setEditingNote(null);
    // Trigger a refresh of the note list to show updated content
    setRefreshTrigger(prev => prev + 1);
    // Notify parent to refresh sidebar notes
    onNotesChange?.();
  };

  const handleEditorClose = () => {
    setEditingNote(null);
  };

  if (!selectedFolder) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Welcome to The Docket
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Select a folder from the sidebar to view its contents, or create a new folder to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedFolder.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Notes and tasks in this folder
          </p>
        </div>

        {/* Notes Section */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <NoteList 
              folderId={selectedFolder.id}
              onNoteSelect={handleNoteSelect}
              refreshTrigger={refreshTrigger}
              onNotesChange={onNotesChange}
            />
          </div>

          {/* Tasks Section - Placeholder for now */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Tasks
              </h3>
              <button className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600">
                New Task
              </button>
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-center py-8">
              No tasks yet. Task management coming soon!
            </div>
          </div>
        </div>
      </div>

      {/* Note Editor Modal */}
      {editingNote && (
        <NoteEditor
          note={editingNote}
          onSave={handleNoteSave}
          onClose={handleEditorClose}
        />
      )}
    </>
  );
}