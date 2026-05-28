'use client';

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { Folder as FolderIcon, FileText, ChevronRight, ChevronDown, Plus, Trash2, Pencil, X, Download, ListTodo } from 'lucide-react';
import { Folder } from '@/types';
import { Page } from '@/types/v2';

interface FolderTreeProps {
  onFolderSelect?: (folder: Folder) => void;
  selectedFolderId?: string;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  refreshTrigger?: number;
  onCreatePage?: (folderId: string, folderName?: string) => void;
  onCreateTask?: () => void;
  onDeletePage?: (pageId: number) => void;
  onMovePage?: (pageId: number, newFolderId: string) => Promise<void>;
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
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onMoveFolder: (folderId: string, newParentId: string) => Promise<void>;
  selectedFolderId?: string;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  refreshTrigger?: number;
  onCreatePage?: (folderId: string, folderName?: string) => void;
  onDeletePage?: (pageId: number) => void;
  onMovePage?: (pageId: number, newFolderId: string) => Promise<void>;
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
  onRenameFolder,
  onMoveFolder,
  selectedFolderId,
  onPageSelect,
  selectedPageId,
  refreshTrigger,
  onCreatePage,
  onDeletePage,
  onMovePage
}: FolderNodeProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [pagesLoaded, setPagesLoaded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const children = useMemo(() => 
    allFolders
      .filter(f => String(f.parentId) === String(folder.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allFolders, folder.id]
  );
  
  const hasChildren = children.length > 0 || pages.length > 0;
  const isExpanded = expandedFolders.has(String(folder.id));
  const isSelected = selectedFolderId === String(folder.id);

  // Fetch pages for this folder
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch(`/api/v2/pages?folderId=${folder.id}`);
        if (response.ok) {
          const data = await response.json();
          setPages(data);
        }
      } catch (error) {
        console.error('Error fetching pages for expand check:', error);
      } finally {
        setPagesLoaded(true);
      }
    };
    
    fetchPages();
  }, [folder.id, refreshTrigger]);

  const handleRenameSubmit = async () => {
    if (!renameValue.trim() || renameValue === folder.name) {
      setIsRenaming(false);
      return;
    }
    await onRenameFolder(folder.id, renameValue);
    setIsRenaming(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData('folderId', folder.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    // Check if it's a page being dropped
    const draggedPageId = e.dataTransfer.getData('pageId');
    if (draggedPageId) {
       if (onMovePage) {
           await onMovePage(Number(draggedPageId), folder.id);
       }
       return;
    }

    const draggedFolderId = e.dataTransfer.getData('folderId');
    if (!draggedFolderId || draggedFolderId === folder.id) return;

    // Check circular dependencies (cannot drop parent into child)
    if (folder.parentId === draggedFolderId) return; // Already parent

    await onMoveFolder(draggedFolderId, folder.id);
  };

  return (
    <div>
      <div 
        draggable={folder.name !== 'Home'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center py-0.5 px-1.5 rounded cursor-pointer hover:bg-bg-tertiary group transition-colors ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : ''
        } ${isDragOver ? 'bg-blue-50 dark:bg-blue-800/40 ring-2 ring-blue-400 ring-inset' : ''}`}
        style={{ paddingLeft: `${level * 8 + 4}px` }}
      >
        {pagesLoaded && hasChildren ? (
          <button
            onClick={() => onToggle(folder.id)}
            className="mr-1 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <div className="w-4 mr-1 flex-shrink-0"></div>
        )}
        
        <div 
          className="flex items-center flex-1 min-w-0"
          onClick={() => !isRenaming && onSelect(folder)}
        >
          <FolderIcon className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-blue-500" />
          
           {isRenaming ? (
              <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit();
                      if (e.key === 'Escape') {
                          setIsRenaming(false);
                          setRenameValue(folder.name);
                      }
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm px-1 py-0.5 border rounded w-full min-w-[50px] outline-none focus:border-blue-500 text-gray-900 bg-white shadow-sm"
              />
          ) : (
             <span className="text-sm text-text-primary truncate">
                {folder.name}
              </span>
          )}
        </div>
        
        <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
          {!isRenaming && (
            <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500"
                    title="Rename"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

              {/* New Page button on hover */}
              {onCreatePage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreatePage(folder.id, folder.name);
                    }}
                    className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-600 rounded text-blue-600 dark:text-blue-400"
                    title="New page in this folder"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
              )}
              {/* Export Folder button on hover */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    // Trigger export
                    try {
                        // We need JSZip to create the zip client-side
                        const JSZip = (await import('jszip')).default;
                        const zip = new JSZip();
                        
                        const res = await fetch(`/api/v2/folders/${folder.id}/export`);
                        if (!res.ok) throw new Error('Failed to fetch folder pages');
                        const data = await res.json();
                        
                        // Import our markdown converter
                        const { jsonToMarkdown } = await import('@/lib/jsonToMarkdown');
                        
                        const pages = data.pages as Page[];
                        if (pages.length === 0) {
                            alert('Folder is empty.');
                            return;
                        }
                        
                        // Convert and add each page to the zip
                        for (const page of pages) {
                            const markdown = jsonToMarkdown(page.content);
                            // Sanitize filename
                            const filename = `${page.title.replace(/[\/\\?%*:|"<>]/g, '-')}.md`;
                            zip.file(filename, markdown);
                        }
                        
                        // Generate and download
                        const content = await zip.generateAsync({ type: 'blob' });
                        const saveAs = (await import('file-saver')).saveAs;
                        saveAs(content, `${data.folderName}.zip`);
                        
                    } catch (e) {
                        console.error('Export failed:', e);
                        alert('Failed to export folder');
                    }
                  }}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-400"
                  title="Export folder to ZIP"
                >
                  <Download className="w-3 h-3" />
                </button>
            </>
          )}
          
          {/* Subfolder button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSubfolder(folder.id);
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="New subfolder"
          >
            <FolderIcon className="w-3 h-3" />
          </button>
          
          {/* Delete folder button (only for non-Home folders) */}
          {folder.name !== 'Home' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteFolder(folder);
              }}
              className="p-0.5 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600 dark:text-red-400"
              title="Delete folder"
            >
              <Trash2 className="w-3 h-3" />
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
          onRenameFolder={onRenameFolder}
          onMoveFolder={onMoveFolder}
          selectedFolderId={selectedFolderId}
          onPageSelect={onPageSelect}
          selectedPageId={selectedPageId}
          refreshTrigger={refreshTrigger}
          onCreatePage={onCreatePage}
          onDeletePage={onDeletePage}
          onMovePage={onMovePage}
          pages={pages}
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
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onMoveFolder: (folderId: string, newParentId: string) => Promise<void>;
  selectedFolderId?: string;
  onPageSelect?: (page: Page) => void;
  selectedPageId?: number;
  refreshTrigger?: number;
  onCreatePage?: (folderId: string, folderName?: string) => void;
  onDeletePage?: (pageId: number) => void;
  onMovePage?: (pageId: number, newFolderId: string) => Promise<void>;
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
  onRenameFolder,
  onMoveFolder,
  selectedFolderId,
  onPageSelect,
  selectedPageId,
  refreshTrigger,
  onCreatePage,
  onDeletePage,
  onMovePage,
  pages
}: FolderContentsProps & { pages: Page[] }) {
  const [deletingPage, setDeletingPage] = useState<Page | null>(null);

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
    <div className={(pages.length > 0 || children.length > 0) ? 'border-l-2 border-gray-200 dark:border-gray-700 ml-1' : ''}>
      {/* Show pages first */}
      {pages.length > 0 && (
        <div className="space-y-1">
          {pages.map((page) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('pageId', page.id.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={`flex items-center py-0.5 px-1.5 rounded cursor-pointer hover:bg-bg-tertiary group ${
                selectedPageId === page.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''
              }`}
              style={{ paddingLeft: `${(level + 1) * 8 + 12}px` }}
            >
              <FileText className="w-3 h-3 mr-1.5 flex-shrink-0 text-gray-400" />
              <span 
                className="text-xs text-text-secondary truncate flex-1"
                onClick={() => onPageSelect?.(page)}
              >
                {truncateTitle(page.title)}
              </span>
              
              {/* Delete page button */}
              {onDeletePage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingPage(page);
                  }}
                  className="p-0.5 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600 dark:text-red-400 ml-1"
                  title="Delete page"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
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
              onRenameFolder={onRenameFolder}
              onMoveFolder={onMoveFolder}
              selectedFolderId={selectedFolderId}
              onPageSelect={onPageSelect}
              selectedPageId={selectedPageId}
              refreshTrigger={refreshTrigger}
              onCreatePage={onCreatePage}
              onDeletePage={onDeletePage}
              onMovePage={onMovePage}
            />
          ))}
        </div>
      )}
          {/* Delete Page Modal */}
      {deletingPage && onDeletePage && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Delete Page
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{deletingPage.title}"?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeletingPage(null);
                }}
                className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeletePage(deletingPage.id);
                    setDeletingPage(null);
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

export default function FolderTree({ onFolderSelect, selectedFolderId, onPageSelect, selectedPageId, refreshTrigger, onCreatePage, onCreateTask, onDeletePage, onMovePage }: FolderTreeProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1'])); // Expand Home by default
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | undefined>();
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [mounted, setMounted] = useState(false);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [unfiledPages, setUnfiledPages] = useState<Page[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Load expanded state
      try {
        const saved = localStorage.getItem('docket_expanded_folders');
        if (saved) {
            setExpandedFolders(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error('Failed to load expanded folders', e);
      }
      setStorageLoaded(true);
      fetchFolders();
      fetchUnfiledPages();
    }
  }, [mounted]);

  // Refresh unfiled pages when trigger changes
  useEffect(() => {
    if (mounted) {
      fetchUnfiledPages();
    }
  }, [refreshTrigger, mounted]);

  // Persist expanded state
  useEffect(() => {
      if (storageLoaded) {
          localStorage.setItem('docket_expanded_folders', JSON.stringify(Array.from(expandedFolders)));
      }
  }, [expandedFolders, storageLoaded]);

  const fetchFolders = async () => {
    try {
      const response = await fetch(`/api/v2/folders?t=${Date.now()}`); // Cache bust
      if (!response.ok) throw new Error('Failed to fetch folders');
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setFolders(data);
      } else {
        console.error('Folders data is not an array:', data);
        setFolders([]);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      setFolders([]);
    }
  };

  const fetchUnfiledPages = async () => {
    try {
      const response = await fetch(`/api/v2/pages?view=all&t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setUnfiledPages(data.filter((p: Page) => p.folder_id === null));
      }
    } catch (error) {
      console.error('Error fetching unfiled pages:', error);
    }
  };

  const buildFolderTree = useCallback((parentId?: string): Folder[] => {
    return folders
      .filter(f => (parentId === undefined ? !f.parentId : String(f.parentId) === parentId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders]);

  const handleToggleExpand = useCallback((folderId: string) => {
    const sId = String(folderId);
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (prev.has(sId)) {
        newExpanded.delete(sId);
      } else {
        newExpanded.add(sId);
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
      const response = await fetch('/api/v2/folders', {
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
      const response = await fetch(`/api/v2/folders/${folder.id}`, {
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

  const handleRenameFolder = async (folderId: string, newName: string) => {
      try {
          const res = await fetch(`/api/v2/folders/${folderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newName })
          });
          if (res.ok) {
              fetchFolders();
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleMoveFolder = async (folderId: string, newParentId: string) => {
      try {
          // If we are moving a folder to the "Root", checking if that's supported.
          // Currently UI doesn't have a specific "Root" drop zone except maybe dragging to top.
          // For now simplest is dragging one folder into another.
          
          const res = await fetch(`/api/v2/folders/${folderId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ parentId: newParentId })
          });
          
          if (res.ok) {
              fetchFolders();
              // Expand the new parent so user sees the moved folder
              setExpandedFolders(prev => new Set([...prev, newParentId]));
          } else {
              const data = await res.json();
              alert(data.error || 'Failed to move folder');
          }
      } catch (e) {
          console.error(e);
      }
  };

  const rootFolders = useMemo(() => buildFolderTree(), [buildFolderTree]);

  const getHomeFolderId = useCallback(() => {
    const home = folders.find(f => f.name === 'Home');
    return home ? String(home.id) : '1';
  }, [folders]);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 mb-1">
        <button
          onClick={() => handleCreateSubfolder(undefined)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="New root folder"
        >
          <FolderIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        </button>
        <button
          onClick={() => onCreatePage?.(getHomeFolderId())}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="New page (in Home)"
        >
          <FileText className="w-3 h-3 text-green-600 dark:text-green-400" />
        </button>
        <button
          onClick={() => onCreateTask?.()}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          title="New standalone task"
        >
          <ListTodo className="w-3 h-3 text-purple-600 dark:text-purple-400" />
        </button>
      </div>

      <div>
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
            onRenameFolder={handleRenameFolder}
            onMoveFolder={handleMoveFolder}
            selectedFolderId={selectedFolderId}
            onPageSelect={onPageSelect}
            selectedPageId={selectedPageId}
            refreshTrigger={refreshTrigger}
            onCreatePage={onCreatePage}
            onDeletePage={onDeletePage}
            onMovePage={onMovePage}
          />
        ))}
      </div>

      {/* Unfiled pages */}
      {unfiledPages.length > 0 && (
        <div className="px-2 space-y-0.5">
          {unfiledPages.map((page) => (
            <div
              key={page.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('pageId', page.id.toString());
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={`flex items-center py-0.5 rounded cursor-pointer hover:bg-bg-tertiary group ${
                selectedPageId === page.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''
              }`}
            >
              <FileText className="w-3 h-3 mr-1.5 flex-shrink-0 text-gray-400" />
              <span 
                className="text-xs text-text-secondary truncate flex-1"
                onClick={() => onPageSelect?.(page)}
              >
                {page.title.length > 25 ? page.title.slice(0, 25) + '...' : page.title}
              </span>
              
              {onDeletePage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePage(page.id);
                  }}
                  className="p-0.5 hover:bg-red-200 dark:hover:bg-red-600 rounded text-red-600 dark:text-red-400 ml-1"
                  title="Delete page"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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