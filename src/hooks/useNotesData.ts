import { useState, useCallback, useRef } from 'react';
import { Note } from '@/types';

interface UseNotesDataReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: () => Promise<void>;
  fetchNotesByFolder: (folderId: string) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  refreshNotes: () => void;
}

// Cache to store fetched notes data
const notesCache = new Map<string, { data: Note[]; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export function useNotesData(): UseNotesDataReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getCacheKey = (folderId?: string) => {
    return folderId ? `folder-${folderId}` : 'all-notes';
  };

  const isValidCache = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const fetchNotes = useCallback(async () => {
    const cacheKey = getCacheKey();
    const cached = notesCache.get(cacheKey);

    if (cached && isValidCache(cached.timestamp)) {
      setNotes(cached.data);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/notes', {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`);
      }

      const data = await response.json();
      setNotes(data);
      
      // Cache the result
      notesCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch notes');
        console.error('Error fetching notes:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotesByFolder = useCallback(async (folderId: string) => {
    const cacheKey = getCacheKey(folderId);
    const cached = notesCache.get(cacheKey);

    if (cached && isValidCache(cached.timestamp)) {
      setNotes(cached.data);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notes?folderId=${folderId}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.statusText}`);
      }

      const data = await response.json();
      setNotes(data);
      
      // Cache the result
      notesCache.set(cacheKey, { data, timestamp: Date.now() });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch notes');
        console.error('Error fetching notes for folder:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`);
      }

      const updatedNote = await response.json();
      
      // Update local state optimistically
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId ? { ...note, ...updatedNote } : note
        )
      );

      // Invalidate cache to ensure fresh data on next fetch
      notesCache.clear();
    } catch (err: any) {
      setError(err.message || 'Failed to update note');
      console.error('Error updating note:', err);
      throw err;
    }
  }, []);

  const refreshNotes = useCallback(() => {
    // Clear cache and refetch
    notesCache.clear();
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    fetchNotes,
    fetchNotesByFolder,
    updateNote,
    refreshNotes,
  };
}