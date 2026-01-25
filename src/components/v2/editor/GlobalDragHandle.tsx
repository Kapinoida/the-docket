import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { BlockTypePopover, BlockType } from '../BlockTypePopover';
import { EditorState, Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { DOMSerializer } from '@tiptap/pm/model';

interface GlobalDragHandleProps {
    editor: Editor;
    pageId: number;
}

// Singleton to track internal drag state reliably across components
export const dragStore = {
    current: null as { pos: number; pageId: number } | null
};

export const GlobalDragHandle: React.FC<GlobalDragHandleProps> = ({ editor, pageId }) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
    const [hoveredNodePos, setHoveredNodePos] = useState<number | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const handleContainerRef = useRef<HTMLDivElement>(null);
    
    // We need to track the current block being hovered
    useEffect(() => {
        if (!editor) return;

        // Using a mouseover listener on the editor element
        const handleMouseMove = (event: MouseEvent) => {
             if (menuOpen) return;
             
             // 1. If hovering the handle itself, keep it visible!
             if (handleContainerRef.current && handleContainerRef.current.contains(event.target as Node)) {
                 return;
             }

             const view = editor.view;
             // If not hovering editor AND not hovering handle (checked above), hide?
             // Actually, if we are far away, we should hide.
             // But valid "gutter" space is outside the editor DOM usually implies we want to track.
             // Let's use a "grace distance" or just rely on resolving a node.
             
             if (!view) return;
             
             // Get editor bounds
             const editorRect = view.dom.getBoundingClientRect();
             
             // 2. Horizontal Projection:
             // Instead of using event.clientX (which might be in the gutter/padding/void),
             // use a fixed X coordinate inside the content column.
             // This ensures we "hit" the block text even if hovering the sidebar.
             const contentLeft = editorRect.left + (editorRect.width / 2); // Center of editor
             
             // Check if Y is reasonably within editor bounds (with some buffer)
             if (event.clientY < editorRect.top - 50 || event.clientY > editorRect.bottom + 50) {
                 setPosition(null);
                 return;
             }
             
             // Check if X is too far out (e.g. sidebar navigation area)
             // Allow hovering in the left gutter (e.g. -100px from left)
             if (event.clientX < editorRect.left - 120 || event.clientX > editorRect.right + 100) {
                 setPosition(null);
                 return;
             }

             // Find the coordinates using projected X
             const pos = view.posAtCoords({ left: contentLeft, top: event.clientY });
             
             // If we can't find a pos in the center (e.g. empty space), try slightly left/right? 
             // Usually center works for blocks.
             if (!pos) {
                 // Try hiding if we genuinely can't map
                 return;
                 // Don't set null immediately, just keep last valid? 
                 // If we setPosition(null), it flicks.
             }

             // Resolve the node at this position
             // ... logic continues ...
             
             // Note: posAtCoords returns the pos "nearest" to the coords. 
             // Inside a block, it points to text.
             
             const $pos = view.state.doc.resolve(pos.pos);
             const depth = $pos.depth;
             
             let targetDepth = depth;
             let targetNode = $pos.node(targetDepth);
             
             // Walk up to find the block
             while (targetDepth > 0) {
                 targetNode = $pos.node(targetDepth);
                 if (targetNode.isBlock) {
                     break;
                 }
                 targetDepth--;
             }
             
             if (targetDepth === 0 || !targetNode || !targetNode.isBlock) {
                 setPosition(null);
                 return;
             }
             
             // Get the start position of this node
             const startPos = $pos.before(targetDepth);
             
             const nodeCoords = view.coordsAtPos(startPos + 1);
             
             // Position relative to viewport
             // Gutter: fixed relative to editor left
             const gutterLeft = editorRect.left - 24; // 24px left of content box
             
             setPosition({
                 top: nodeCoords.top - 4,
                 left: gutterLeft
             });
             setHoveredNodePos(startPos);
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
             window.removeEventListener('mousemove', handleMouseMove);
        };
    }, [editor, menuOpen]);

    // Handle Drag Start
    const handleDragStart = (event: React.DragEvent) => {
        if (!editor || hoveredNodePos === null) return;
        
        // Set global drag store
        dragStore.current = {
            pos: hoveredNodePos,
            pageId: pageId
        };
        
        const view = editor.view;
        const node = view.state.doc.nodeAt(hoveredNodePos);
        if (!node) return;

        // 1. Select the node
        const tr = view.state.tr.setSelection(
            NodeSelection.create(view.state.doc, hoveredNodePos)
        );
        view.dispatch(tr);

        // 2. Serialize content
        const slice = view.state.selection.content();
        
        const serializer = DOMSerializer.fromSchema(editor.schema);
        const fragment = serializer.serializeFragment(slice.content);
        
        const div = document.createElement('div');
        div.appendChild(fragment);
        const html = div.innerHTML;
        const text = slice.content.textBetween(0, slice.content.size, '\n\n');

        // 3. Set DataTransfer
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData('text/html', html);
        event.dataTransfer.setData('text/plain', text);
        event.dataTransfer.setData('application/x-docket-drag', 'true');
        event.dataTransfer.setData('docket-src-pos', hoveredNodePos.toString());
        event.dataTransfer.setData('docket-src-page-id', pageId.toString());
        
        // 4. Visuals
        const nodeDOM = view.nodeDOM(hoveredNodePos) as HTMLElement;
        if (nodeDOM) {
             const rect = nodeDOM.getBoundingClientRect();
             const x = event.clientX - rect.left;
             const y = event.clientY - rect.top;
             event.dataTransfer.setDragImage(nodeDOM, x, y);
        }
    };
    



    
    const handleDragEnd = () => {
        dragStore.current = null;
    };

    const handleMouseDown = () => {
        if (!editor || hoveredNodePos === null) return;
        // Select the node
        editor.commands.setNodeSelection(hoveredNodePos);
    };

    const handleBlockTypeSelect = (type: BlockType) => {
         if (hoveredNodePos === null) return;
         setMenuOpen(false);
         
         // Select the target node
         editor.commands.setNodeSelection(hoveredNodePos);
         const chain = editor.chain().focus();
         
         // Helper to get content if needed
         const node = editor.state.doc.nodeAt(hoveredNodePos);
         const content = node?.textContent || '';

         switch (type) {
          case 'paragraph': chain.setParagraph().run(); break;
          case 'heading1': chain.toggleHeading({ level: 1 }).run(); break;
          case 'heading2': chain.toggleHeading({ level: 2 }).run(); break;
          case 'bulletList': chain.toggleBulletList().run(); break;
          case 'orderedList': chain.toggleOrderedList().run(); break;
          case 'quote': chain.toggleBlockquote().run(); break;
          case 'code': chain.toggleCodeBlock().run(); break;
          case 'subpage':
              chain.insertPageLink({ tempTitle: content || 'Untitled Page' }).run();
              // Clean up original node if it wasn't replaced automatically (insertPageLink inserts, doesn't always replace block)
              // Actually insertContent usually replaces selection.
              break;
          case 'task':
              // Convert to custom v2Task node
              // We use setNode to attempt to preserve content (if converting from paragraph/heading)
              chain.setNode('v2Task', { pageId }).run();
              break;
      }
    };

    if (!position) return null;

    return (
        <div 
            ref={handleContainerRef}
            className="fixed z-50 flex items-center gap-1 transition-all duration-75"
            style={{ 
                top: position.top, 
                left: position.left,
                opacity: menuOpen ? 1 : undefined // Keep visible if menu open
            }}
             // Hide if not hovering editor and menu not open? Handled by mousemove logic clearing pos
        >
             <div
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                draggable="true"
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onMouseDown={handleMouseDown}
             >
                 <GripVertical size={16} />
             </div>
             
             <div className="relative">
                 <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 ${menuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-600' : ''}`}
                 >
                     <MoreHorizontal size={16} />
                 </button>
                 
                 {menuOpen && (
                     <BlockTypePopover 
                        onSelect={handleBlockTypeSelect}
                        onClose={() => setMenuOpen(false)}
                        position={{ top: 25, left: 0 }}
                     />
                 )}
             </div>
        </div>
    );
};
