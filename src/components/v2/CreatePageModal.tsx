'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';

interface CreatePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string) => Promise<void>;
  folderName?: string;
}

export default function CreatePageModal({ isOpen, onClose, onSubmit, folderName }: CreatePageModalProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      // Slight delay to allow render
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit(title);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-bg-primary rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all border border-border-default">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-secondary">
          <div className="flex items-center gap-2 text-text-primary font-semibold">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">
                <FileText size={18} className="text-accent-blue" />
            </div>
            Create New Note
          </div>
          <button 
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="pageTitle" className="block text-sm font-medium text-text-secondary mb-1.5">
                Title
              </label>
              <input
                ref={inputRef}
                id="pageTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Project Ideas, weekly Review..."
                className="w-full px-4 py-2 rounded-lg border border-border-default bg-bg-primary text-text-primary focus:ring-2 focus:ring-blue-500/20 focus:border-accent-blue outline-none transition-all placeholder:text-text-muted"
                autoComplete="off"
              />
              {folderName && (
                  <p className="mt-2 text-xs text-text-muted">
                      Creating in <span className="font-medium text-text-primary">{folderName}</span>
                  </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-secondary rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                {isSubmitting ? 'Creating...' : 'Create Note'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
