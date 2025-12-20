'use client';

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Folder, Note } from '@/types';

interface FolderTreeProps {
  onFolderSelect?: (folder: Folder) => void;
  selectedFolderId?: string;
  onNoteSelect?: (note: Note) => void;
  selectedNoteId?: string;
  refreshTrigger?: number;
  onCreateNote?: (folderId: string) => void;
  onCreateTask?: () => void;
  onDeleteNote?: (noteId: string) => void;
}

interface FolderNodeProps {
  folder: Folder;
  allFolders: Folder[];
  level: number;
  expandedFolders: Set<string>;
  onToggle: (folderId: string) => void;
  onSelect: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder: (folder: Folder) => void;
  selectedFolderId?: string;
  onNoteSelect?: (note: Note) => void;
  selectedNoteId?: string;
  refreshTrigger?: number;
  onCreateNote?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

const FolderNode = memo(function FolderNode({ 
  folder, 
  allFolders,
  level, 
  expandedFolders,
  onToggle, 
  onSelect, 
  onCreateSubfolder,
  onDeleteFolder,
  selectedFolderId,
  onNoteSelect,
  selectedNoteId,
  refreshTrigger,
  onCreateNote,
  onDeleteNote
}: FolderNodeProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  
  const children = useMemo(() => 
    allFolders
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allFolders, folder.id]
  );
  
  const hasChildren = children.length > 0 || notes.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  // Fetch notes for this folder to determine if it has content
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/notes?folderId=${folder.id}`);
        if (response.ok) {
          const data = await response.json();
          setNotes(data);
        }
      } catch (error) {
        console.error('Error fetching notes for expand check:', error);
      } finally {
        setNotesLoaded(true);
      }
    };
    
    fetchNotes();
  }, [folder.id, refreshTrigger]);

  return (
    <div>
      <div 
        className={`flex items-center py-0.5 px-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
        }`}
        style={{ paddingLeft: `${level * 10 + 6}px` }}
      >
        {notesLoaded && hasChildren ? (
          <button
            onClick={() => onToggle(folder.id)}
            className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
          >
            <svg
              className={`w-3 h-3 transform transition-transform text-gray-500 dark:text-gray-400 ${
                isExpanded ? 'rotate-90' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <div className="w-4 mr-1 flex-shrink-0"></div>
        )}
        
        <div 
          className="flex items-center flex-1 min-w-0"
          onClick={() => onSelect(folder)}
        >
          <svg
            className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-blue-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="text-sm text-gray-900 dark:text-white truncate">
            {folder.name}
          </span>
        </div>
        
        <div className="flex items-center gap-0.5">
          {/* New Note button on hover */}
          {onCreateNote && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(folder.id);
              }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-blue-200 dark:hover:bg-blue-600 rounded text-blue-600 dark:text-blue-400"
              title="New note in this folder"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          
          {/* Subfolder button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="New subfolder"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </button>
          
          {/* Delete folder button (only for non-Home folders) */}
          {folder.name !== 'Home' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder);
              }}
              className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600 dark:text-red-400"
              title="Delete folder"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
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
          )}
        </div>
      </div>
      
      {isExpanded && (
        <FolderContents
          folder={folder}
          allFolders={allFolders}
          level={level}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onSelect={onSelect}
          onCreateSubfolder={onCreateSubfolder}
          onDeleteFolder={onDeleteFolder}
          selectedFolderId={selectedFolderId}
          onNoteSelect={onNoteSelect}
          selectedNoteId={selectedNoteId}
          refreshTrigger={refreshTrigger}
          onCreateNote={onCreateNote}
          onDeleteNote={onDeleteNote}
        />
      )}
    </div>
  );
});

interface FolderContentsProps {
  folder: Folder;
  allFolders: Folder[];
  level: number;
  expandedFolders: Set<string>;
  onToggle: (folderId: string) => void;
  onSelect: (folder: Folder) => void;
  onCreateSubfolder: (parentId: string) => void;
  onDeleteFolder: (folder: Folder) => void;
  selectedFolderId?: string;
  onNoteSelect?: (note: Note) => void;
  selectedNoteId?: string;
  refreshTrigger?: number;
  onCreateNote?: (folderId: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

const FolderContents = memo(function FolderContents({
  folder,
  allFolders,
  level,
  expandedFolders,
  onToggle,
  onSelect,
  onCreateSubfolder,
  onDeleteFolder,
  selectedFolderId,
  onNoteSelect,
  selectedNoteId,
  refreshTrigger,
  onCreateNote,
  onDeleteNote
}: FolderContentsProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && folder.id) {
      fetchNotes();
    }
  }, [mounted, folder.id, refreshTrigger]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/notes?folderId=${folder.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const truncateTitle = (title: string, maxLength = 25) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  const children = useMemo(() => 
    allFolders
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allFolders, folder.id]
  );

  return (
    <div>
      {/* Show notes first */}
      {notes.length > 0 && (
        <div className="space-y-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`flex items-center py-0.5 px-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 group ${
                selectedNoteId === note.id ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              style={{ paddingLeft: `${(level + 1) * 10 + 16}px` }}
            >
              <svg
                className="w-3 h-3 mr-1.5 flex-shrink-0 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <span 
                className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1"
                onClick={() => onNoteSelect?.(note)}
              >
                {truncateTitle(note.title)}
              </span>
              
              {/* Delete note button */}
              {onDeleteNote && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingNote(note);
                  }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600 dark:text-red-400 ml-1"
                  title="Delete note"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show loading state for notes */}
      {loading && (
        <div 
          className="text-xs text-gray-400 px-1.5 py-0.5"
          style={{ paddingLeft: `${(level + 1) * 10 + 16}px` }}
        >
          Loading notes...
        </div>
      )}

      {/* Then show child folders */}
      {children.length > 0 && (
        <div className="mt-1">
          {children.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              level={level + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreateSubfolder={onCreateSubfolder}
              onDeleteFolder={onDeleteFolder}
              selectedFolderId={selectedFolderId}
              onNoteSelect={onNoteSelect}
              selectedNoteId={selectedNoteId}
              refreshTrigger={refreshTrigger}
              onCreateNote={onCreateNote}
              onDeleteNote={onDeleteNote}
            />
          ))}
        </div>
      )}
          {/* Delete Note Modal */}
      {deletingNote && onDeleteNote && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Note
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deletingNote.title}"? This will also delete all tasks associated with this note.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeletingNote(null);
                }}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteNote(deletingNote.id);
                    setDeletingNote(null);
                }}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default function FolderTree({ onFolderSelect, selectedFolderId, onNoteSelect, selectedNoteId, refreshTrigger, onCreateNote, onCreateTask, onDeleteNote }: FolderTreeProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1'])); // Expand Home by default
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>();
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchFolders();
    }
  }, [mounted]);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const buildFolderTree = useCallback((parentId?: string): Folder[] => {
    return folders
      .filter(f => (parentId === undefined ? !f.parentId : f.parentId === parentId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders]);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (prev.has(folderId)) {
        newExpanded.delete(folderId);
      } else {
        newExpanded.add(folderId);
      }
      return newExpanded;
    });
  }, []);

  const handleCreateSubfolder = useCallback((parentId: string | undefined) => {
    setNewFolderParentId(parentId);
    setIsCreatingFolder(true);
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentId: newFolderParentId,
        }),
      });

      if (response.ok) {
        await fetchFolders();
        setIsCreatingFolder(false);
        setNewFolderName('');
        setNewFolderParentId(undefined);
        
        // Auto-expand parent folder
        if (newFolderParentId) {
          setExpandedFolders(prev => new Set([...prev, newFolderParentId]));
        }
      }
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  };

  const handleDeleteFolder = async (folder: Folder) => {
    // Check if folder has children
    const hasChildren = folders.some(f => f.parentId === folder.id);
    
    if (hasChildren) {
      alert('Cannot delete folder with subfolders. Please delete or move subfolders first.');
      return;
    }

    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFolders();
        setDeletingFolder(null);
        
        // If deleted folder was selected, clear selection
        if (selectedFolderId === folder.id && onFolderSelect) {
          onFolderSelect(folders.find(f => f.name === 'Home') || folders[0]);
        }
      } else {
        alert('Failed to delete folder. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Error deleting folder. Please try again.');
    }
  };

  const rootFolders = useMemo(() => buildFolderTree(), [buildFolderTree]);

  const getHomeFolderId = useCallback(() => {
    return folders.find(f => f.name === 'Home')?.id || '1';
  }, [folders]);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-1.5 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Folders</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleCreateSubfolder(undefined)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="New root folder"
          >
            <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          </button>
          <button
            onClick={() => onCreateNote?.(getHomeFolderId())}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="New note (in Home)"
          >
            <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => onCreateTask?.()}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="New standalone task"
          >
            <svg className="w-3 h-3 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="group">
        {rootFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            allFolders={folders}
            level={0}
            expandedFolders={expandedFolders}
            onToggle={handleToggleExpand}
            onSelect={(folder) => onFolderSelect?.(folder)}
            onCreateSubfolder={handleCreateSubfolder}
            onDeleteFolder={setDeletingFolder}
            selectedFolderId={selectedFolderId}
            onNoteSelect={onNoteSelect}
            selectedNoteId={selectedNoteId}
            refreshTrigger={refreshTrigger}
            onCreateNote={onCreateNote}
            onDeleteNote={onDeleteNote}
          />
        ))}
      </div>

      {isCreatingFolder && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="w-full p-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateFolder();
              } else if (e.key === 'Escape') {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderParentId(undefined);
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleCreateFolder}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
                setNewFolderParentId(undefined);
              }}
              className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Folder
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deletingFolder.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingFolder(null)}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteFolder(deletingFolder)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}