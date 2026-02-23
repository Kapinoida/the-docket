'use client';

import { useEffect, useState, useRef } from 'react';
import { FolderInput, Loader2 } from 'lucide-react';
import { Folder } from '@/types';

interface MovePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (folderId: string | null) => Promise<void>;
  title: string;
  currentFolderId?: string | null;
}

export function MovePageModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  currentFolderId,
}: MovePageModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolderId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/v2/folders')
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                // sort alphabetically
                data.sort((a, b) => a.name.localeCompare(b.name));
                setFolders(data);
            }
        })
        .finally(() => setIsLoading(false));
      
      setSelectedFolder(currentFolderId || null);
    }
  }, [isOpen, currentFolderId]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
      setIsSubmitting(true);
      try {
          await onConfirm(selectedFolder);
          onClose();
      } catch (err) {
          console.error(err);
      } finally {
          setIsSubmitting(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700 transform transition-all scale-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-full flex-shrink-0 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <FolderInput className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white leading-6">
              Move "{title}"
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Select a new folder location for this page.
            </p>
          </div>
        </div>

        <div className="mt-4 pl-12">
            {isLoading ? (
                <div className="flex items-center text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading folders...
                </div>
            ) : (
                <select
                    value={selectedFolder || ''}
                    onChange={(e) => setSelectedFolder(e.target.value || null)}
                    className="w-full relative px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                >
                    <option value="">Home (No Folder)</option>
                    {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                            {folder.name}
                        </option>
                    ))}
                </select>
            )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading || selectedFolder === currentFolderId}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Moving...
                </>
            ) : (
                'Move'
            )}
          </button>
        </div>
      </div>
      
      <div className="fixed inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
