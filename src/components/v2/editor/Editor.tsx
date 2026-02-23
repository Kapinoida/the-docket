import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { common, createLowlight } from 'lowlight';
import { Extension } from '@tiptap/core';
import { TaskExtension } from './extensions/TaskExtension';
import { PageLinkExtension } from './extensions/PageLinkExtension';
import { SlashCommand } from './extensions/SlashCommand';
import { TagExtension } from './extensions/TagExtension';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useState, useRef } from 'react';
import { Page } from '../../../types/v2';
import { CheckSquare, Save, Bold, Italic, Link as LinkIcon, Highlighter, Code, Trash2, Plus, GripVertical, GripHorizontal, RefreshCw, AlertTriangle } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';
import { GlobalDragHandle, dragStore } from './GlobalDragHandle';

const lowlight = createLowlight(common);

interface EditorProps {
  pageId: number;
  pageTitle?: string;
  initialContent: any;
  initialUpdatedAt: Date;
}

export default function V2Editor({ pageId, pageTitle, initialContent, initialUpdatedAt }: EditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(initialUpdatedAt ? new Date(initialUpdatedAt) : null);
  
  // Update Check State
  const [serverUpdatedAt, setServerUpdatedAt] = useState<Date>(new Date(initialUpdatedAt));
  const [hasNewerVersion, setHasNewerVersion] = useState(false);
  const lastKnownUpdateRef = useRef<Date>(new Date(initialUpdatedAt));

  // Update ref when prop changes (e.g. initial load or parent refresh)
  useEffect(() => {
    lastKnownUpdateRef.current = new Date(initialUpdatedAt);
    setServerUpdatedAt(new Date(initialUpdatedAt));
    setLastSaved(new Date(initialUpdatedAt));
    setHasNewerVersion(false);
  }, [initialUpdatedAt]);

  // Poll for updates
  useEffect(() => {
    if (!pageId) return;

    const checkForUpdates = async () => {
        try {
            const res = await fetch(`/api/v2/pages?id=${pageId}`);
            if (res.ok) {
                const data = await res.json();
                const remoteDate = new Date(data.updated_at);
                
                // If remote date is newer than our last known save/load time
                // AND the difference is significant (> 2 seconds to avoid clock skew issues with self-saves)
                if (remoteDate.getTime() > lastKnownUpdateRef.current.getTime() + 2000) {
                    setHasNewerVersion(true);
                }
            }
        } catch (e) {
            console.error("Failed to check for updates", e);
        }
    };

    const intervalId = setInterval(checkForUpdates, 30000); // Check every 30 seconds
    return () => clearInterval(intervalId);
  }, [pageId]);

  const handleRefresh = () => {
      window.location.reload();
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions that we add manually to avoid duplicates
        codeBlock: false,
        // We explicitly add Link extension later, so disable it here to prevent 'Duplicate extension names' warning
        link: false,
      }),
      Placeholder.configure({
          placeholder: 'Type \'/\' for commands...',
      }),
      TaskExtension.configure({
          pageId: pageId, 
      }),
      PageLinkExtension.configure({
          currentPageId: pageId
      }),
      TiptapImage.configure({
          inline: true,
          allowBase64: true,
      }),
      Highlight,
      Typography,
      Link.configure({
          openOnClick: false,
          autolink: true,
      }),
      CodeBlockLowlight.configure({
          lowlight,
      }),
      Table.configure({
          resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
          types: ['heading', 'paragraph'],
      }),
      SlashCommand,
      TagExtension,
      Markdown.configure({
          html: false,
          transformCopiedText: true,
          transformPastedText: true,
      }),
    ],
    content: initialContent || { type: 'doc', content: [] },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[50vh] p-4 md:p-8 pb-[80vh]',
      },
      handleDrop: (view, event, slice, moved) => {
        // 1. Handle File Uploads (Images)
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            uploadImage(file).then(url => {
               if (url) {
                   const { schema } = view.state;
                   const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                   if (coordinates) {
                       const node = schema.nodes.image.create({ src: url });
                       const transaction = view.state.tr.insert(coordinates.pos, node);
                       view.dispatch(transaction);
                   }
               }
            });
            return true; // handled
          }
        }
        
        // 2. Handle Content Drops (Block Reordering)
        const types = event.dataTransfer?.types ? Array.from(event.dataTransfer.types) : [];
        const isInternalDrag = types.includes('application/x-docket-drag');
        
        if (moved || isInternalDrag || (slice && slice.content.size > 0)) {
            let coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            
            // Fallback for dropping in padding/margins
            if (!coordinates) {
                 const doc = view.state.doc;
                 // If we are well below the content, assume append to end
                 // We can check if clientY is greater than the last node's bottom?
                 // Simple heuristic: If Y is large -> end, if Y is small -> start?
                 // Better: check bounding rect of editor
                 const editorRect = view.dom.getBoundingClientRect();
                 if (event.clientY > editorRect.bottom - 50) { // Near bottom or below
                      coordinates = { pos: doc.content.size, inside: -1 };
                 } else if (event.clientY < editorRect.top + 50) { // Near top
                      coordinates = { pos: 0, inside: -1 };
                 } else {
                     // Maybe in side margins? Snap to nearest line?
                     // For now, let's just default to end if we are inside the DOM but no coords found (often happens at bottom padding)
                     coordinates = { pos: doc.content.size, inside: -1 };
                 }
            }
            
            if (!coordinates) {
                return false;
            }
            
            const $pos = view.state.doc.resolve(coordinates.pos);
            
            // Find the visual block node we are hovering over
            let depth = $pos.depth;
            let node = $pos.node(depth);
            while (depth > 0 && node && !node.isBlock) {
                depth--;
                node = $pos.node(depth);
            }
            
            // Ensure we are operating on a block OR the root doc
            if (node && node.isBlock) {
                 // Logic to calculate drop position
                 let finalPos = coordinates.pos;
                 
                 // If we are inside a specific block (not root), determine "before" vs "after" split
                 if (depth > 0) {
                     const beforePos = $pos.before(depth);
                     let dom = view.nodeDOM(beforePos) as HTMLElement;
                     
                     if (!dom) {
                        // Fallback DOM finding
                         const target = document.elementFromPoint(event.clientX, event.clientY);
                         dom = target?.closest('[data-node-view-wrapper], .ProseMirror-widget, p, h1, h2, h3, li') as HTMLElement;
                     }
    
                     if (dom) {
                         const rect = dom.getBoundingClientRect();
                         const midY = rect.top + rect.height / 2;
                         const isTopHalf = event.clientY < midY;
                         finalPos = isTopHalf ? beforePos : $pos.after(depth);
                     }
                 }
                 
                 // Perform the move
                 let tr = view.state.tr;
                     
                 // Robustly check for internal drag using shared singleton
                 const dragState = dragStore.current;
                 const isSamePageInternalDrag = !!dragState && dragState.pageId === pageId;
                 const shouldMove = moved || isSamePageInternalDrag;

                 if (shouldMove) {
                     let from: number | undefined;
                     let to: number | undefined;
                     
                     // Strategy 1: Explicit Position from DragStore
                     if (isSamePageInternalDrag && dragState) {
                         const pos = dragState.pos;
                         if (pos >= 0 && pos < view.state.doc.content.size) {
                             const node = view.state.doc.nodeAt(pos);
                             if (node) {
                                 from = pos;
                                 to = pos + node.nodeSize;
                             }
                         }
                     }
                     
                     // Strategy 2: Selection Fallback
                     if (from === undefined || to === undefined) {
                         const sel = view.state.selection;
                         from = sel.from;
                         to = sel.to;
                     }

                     // Strategy 3: Task ID Search (The "Nuclear Option" for Tasks)
                     if (slice.content.childCount === 1) {
                         const child = slice.content.firstChild;
                         if (child && child.type.name === 'v2Task' && child.attrs.taskId) {
                             const targetId = child.attrs.taskId;
                             
                             // Check current match
                             let currentMatch = false;
                             if (from !== undefined) {
                                 const nodeAtFrom = view.state.doc.nodeAt(from);
                                 if (nodeAtFrom && nodeAtFrom.type.name === 'v2Task' && nodeAtFrom.attrs.taskId === targetId) {
                                     currentMatch = true;
                                 }
                             }
                             
                             if (!currentMatch) {
                                 // Search the doc
                                 view.state.doc.descendants((node, pos) => {
                                     if (node.type.name === 'v2Task' && node.attrs.taskId === targetId) {
                                         from = pos;
                                         to = pos + node.nodeSize;
                                         return false; // Stop search
                                     }
                                     return true;
                                 });
                             }
                         }
                     }
                     
                     // Dropping on self?
                     if (from !== undefined && to !== undefined) {
                        if (finalPos >= from && finalPos <= to) {
                            return true; // Cancel drop on self
                        }
                        
                        tr.delete(from, to);
                        const mappedPos = tr.mapping.map(finalPos);
                        tr.insert(mappedPos, slice.content);
                     } else {
                         tr.insert(finalPos, slice.content);
                     }
                 } else {
                     tr.insert(finalPos, slice.content);
                 }
                 
                 view.dispatch(tr);
                 return true;
             }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
          const items = Array.from(event.clipboardData?.items || []);
          const item = items.find(i => i.type.indexOf('image') === 0);
          if (item) {
              const file = item.getAsFile();
              if (file) {
                  uploadImage(file).then(url => {
                      if (url) {
                          editor?.chain().focus().setImage({ src: url }).run();
                      }
                  });
                  return true; // Handled
              }
          }
          return false;
      },
    },
    onUpdate: ({ editor }) => {
      handleSave(editor.getJSON());
    },
    onSelectionUpdate: ({ editor }) => {
      const { view } = editor;
      if (editor.isFocused) {
          const selection = view.state.selection;
          const cursorPos = view.coordsAtPos(selection.from);
          const centerViewport = window.innerHeight / 2;
          
          // Calculate distance from center
          const distance = cursorPos.top - centerViewport;
          
          // If cursor is significantly away from center (e.g., > 50px)
          if (Math.abs(distance) > 50) {
             // Find scrolling container (main)
             const scroller = view.dom.closest('main') || window;
             scroller.scrollBy({ top: distance, behavior: 'smooth' });
          }
      }
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
          setIsSaving(true);
          const res = await fetch('/api/v2/upload', {
              method: 'POST',
              body: formData
          });
          
          if (res.ok) {
              const data = await res.json();
              return data.url;
          }
          console.error('Upload failed');
          return null;
      } catch (e) {
          console.error('Error uploading:', e);
          return null;
      } finally {
          setIsSaving(false);
      }
  };

  // Debounced save
  useEffect(() => {
    // Note: in a real app, use a robust debounce hook.
    // For now, rely on manual save or strict onUpdate triggers (which can be spammy).
    // Let's implement a simple debounce for the `handleSave`.
  }, []);

  // Debounced save ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, []);

  const handleSave = (content: any) => {
    if (!pageId) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    
    // Set loading state immediately for UI feedback
    setIsSaving(true);

    // Set new timeout
    saveTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v2/pages?id=${pageId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          });
          
          if (res.ok) {
              const data = await res.json();
              // Update our local knowledge of the server state so we don't warn about our own edits
              const newDate = new Date(data.updated_at);
              lastKnownUpdateRef.current = newDate;
              setLastSaved(newDate);
              setServerUpdatedAt(newDate);
              // If we had a warning, clear it if we successfully overwrote (though ideally we should have stopped them, 
              // but for now this is a collaborative "check" not a lock)
              setHasNewerVersion(false); 
          }
        } catch (err) {
          console.error('Failed to save', err);
        } finally {
          setIsSaving(false);
          saveTimeoutRef.current = null;
        }
    }, 1000); // 1 second debounce
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
        {hasNewerVersion && (
            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center justify-between text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={18} />
                    <span className="font-medium">Page has been updated in another tab/window.</span>
                </div>
                <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-800 hover:bg-amber-200 dark:hover:bg-amber-700 rounded text-sm transition-colors"
                >
                    <RefreshCw size={14} />
                    Refresh Page
                </button>
            </div>
        )}

        <div className="mb-4 flex items-center justify-between text-sm text-text-muted pb-2 border-b border-border-default">
             {/* Toolbar container */}
             <div className="flex-1">
                 <EditorToolbar editor={editor} pageTitle={pageTitle} />
             </div>
            
            <div className="flex items-center gap-2 ml-4 self-start mt-1 h-6 min-w-[24px] justify-end" title={lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : 'Unsaved'}>
                {isSaving ? (
                    <RefreshCw size={16} className="text-blue-500 animate-spin" />
                ) : lastSaved ? (
                     <CheckSquare size={16} className="text-green-500/50" />
                ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
                )}
            </div>
        </div>

      <EditorContent editor={editor} />
      
      {/* Global Handle Overlay */}
      <GlobalDragHandle editor={editor} pageId={pageId} />
      
      <div className="mt-8 pt-8 border-t text-xs text-gray-400 opacity-50 hover:opacity-100 transition-opacity">
          Type <code>/</code> for commands, <code>[ ]</code> for checks, or select text to format.
      </div>
    </div>
  );
}
