import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import { BlockTypePopover, BlockType } from '../BlockTypePopover';
import { NodeSelection } from '@tiptap/pm/state';
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
    const lastNodePosRef = useRef<number | null>(null);

    const hideHandle = useCallback(() => {
        setPosition(null);
        setHoveredNodePos(null);
        lastNodePosRef.current = null;
    }, []);

    // Mousemove + scroll tracking
    useEffect(() => {
        if (!editor) return;

        const resolveNodeAt = (clientY: number, clientX: number): { pos: number; startPos: number; top: number } | null => {
            const view = editor.view;
            if (!view) return null;

            const editorRect = view.dom.getBoundingClientRect();

            // Try clientX directly first (handles gutter hover accurately when cursor is over content)
            let pos = view.posAtCoords({ left: clientX, top: clientY });

            // Fallback 1: project to center of editor (catches gutter/margin hovers)
            if (!pos) {
                const contentLeft = editorRect.left + (editorRect.width / 2);
                pos = view.posAtCoords({ left: contentLeft, top: clientY });
            }

            // Fallback 2: try 25% horizontal position
            if (!pos) {
                const leftQuarter = editorRect.left + (editorRect.width / 4);
                pos = view.posAtCoords({ left: leftQuarter, top: clientY });
            }

            // Fallback 3: try 75% horizontal position
            if (!pos) {
                const rightQuarter = editorRect.left + (editorRect.width * 3 / 4);
                pos = view.posAtCoords({ left: rightQuarter, top: clientY });
            }

            if (!pos) return null;

            const $pos = view.state.doc.resolve(pos.pos);
            let targetDepth = $pos.depth;
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
                return null;
            }

            const startPos = $pos.before(targetDepth);
            const nodeCoords = view.coordsAtPos(startPos + 1);

            return { pos: pos.pos, startPos, top: nodeCoords.top };
        };

        const handleMouseMove = (event: MouseEvent) => {
            if (menuOpen) return;

            // If hovering the handle itself, keep it visible
            if (handleContainerRef.current && handleContainerRef.current.contains(event.target as Node)) {
                return;
            }

            const view = editor.view;
            if (!view) return;

            const editorRect = view.dom.getBoundingClientRect();

            // Check if Y is reasonably within editor bounds (with some buffer)
            if (event.clientY < editorRect.top - 50 || event.clientY > editorRect.bottom + 50) {
                hideHandle();
                return;
            }

            // Check if X is too far out (e.g. sidebar navigation area)
            if (event.clientX < editorRect.left - 120 || event.clientX > editorRect.right + 100) {
                hideHandle();
                return;
            }

            const resolved = resolveNodeAt(event.clientY, event.clientX);
            if (!resolved) {
                return; // Keep last valid position instead of flickering
            }

            const gutterLeft = editorRect.left - 24;

            setPosition({
                top: resolved.top - 4,
                left: gutterLeft
            });
            setHoveredNodePos(resolved.startPos);
            lastNodePosRef.current = resolved.startPos;
        };

        const handleScroll = () => {
            if (menuOpen) return; // Don't hide while popover is open
            // Hide the handle during scroll; it will reappear on next mousemove
            hideHandle();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [editor, menuOpen, hideHandle]);

    // Handle Drag Start
    const handleDragStart = (event: React.DragEvent) => {
        if (!editor || hoveredNodePos === null) return;

        dragStore.current = {
            pos: hoveredNodePos,
            pageId: pageId
        };

        const view = editor.view;
        const node = view.state.doc.nodeAt(hoveredNodePos);
        if (!node) return;

        // Select the node
        const tr = view.state.tr.setSelection(
            NodeSelection.create(view.state.doc, hoveredNodePos)
        );
        view.dispatch(tr);

        // Serialize content
        const slice = view.state.selection.content();

        const serializer = DOMSerializer.fromSchema(editor.schema);
        const fragment = serializer.serializeFragment(slice.content);

        const div = document.createElement('div');
        div.appendChild(fragment);
        const html = div.innerHTML;
        const text = slice.content.textBetween(0, slice.content.size, '\n\n');

        // Set DataTransfer
        event.dataTransfer.effectAllowed = 'copyMove';
        event.dataTransfer.setData('text/html', html);
        event.dataTransfer.setData('text/plain', text);
        event.dataTransfer.setData('application/x-docket-drag', 'true');
        event.dataTransfer.setData('docket-src-pos', hoveredNodePos.toString());
        event.dataTransfer.setData('docket-src-page-id', pageId.toString());

        // Visuals
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
        // Clear position so the grip doesn't linger after a drag
        hideHandle();
    };

    const handleMouseDown = () => {
        if (!editor || hoveredNodePos === null) return;
        editor.commands.setNodeSelection(hoveredNodePos);
    };

    const handleBlockTypeSelect = (type: BlockType) => {
        if (hoveredNodePos === null) return;
        setMenuOpen(false);

        editor.commands.setNodeSelection(hoveredNodePos);
        const chain = editor.chain().focus();

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
            case 'subpage': {
                // Replace the entire block with a page link
                const nodeSize = node?.nodeSize || 0;
                if (nodeSize > 0) {
                    chain
                        .deleteRange({ from: hoveredNodePos, to: hoveredNodePos + nodeSize })
                        .insertPageLink({ tempTitle: content || 'Untitled Page' })
                        .insertContent(' ')
                        .run();
                } else {
                    chain.insertPageLink({ tempTitle: content || 'Untitled Page' }).run();
                }
                break;
            }
            case 'task':
                chain.setNode('v2Task', { pageId }).run();
                break;
        }
    };

    if (!position) return null;

    return (
        <div
            ref={handleContainerRef}
            className="fixed z-50 flex items-center gap-1 transition-all duration-75"
            role="toolbar"
            aria-label="Block actions"
            style={{
                top: position.top,
                left: position.left,
                opacity: menuOpen ? 1 : undefined
            }}
        >
            <div
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                draggable="true"
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onMouseDown={handleMouseDown}
                aria-label="Drag to move block"
            >
                <GripVertical size={16} />
            </div>

            <div className="relative">
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 ${menuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-600' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    aria-label="Change block type"
                >
                    <MoreHorizontal size={16} />
                </button>

                {menuOpen && (
                    <BlockTypePopover
                        onSelect={handleBlockTypeSelect}
                        onClose={() => setMenuOpen(false)}
                        position={{ top: 25, left: 0 }}
                        currentType={getCurrentBlockType(editor, hoveredNodePos)}
                    />
                )}
            </div>
        </div>
    );
};

// Helper to determine the current block type for active state in the popover
function getCurrentBlockType(editor: Editor, pos: number | null): BlockType | null {
    if (pos === null) return null;
    try {
        const node = editor.state.doc.nodeAt(pos);
        if (!node) return null;
        switch (node.type.name) {
            case 'paragraph': return 'paragraph';
            case 'heading':
                if (node.attrs.level === 1) return 'heading1';
                if (node.attrs.level === 2) return 'heading2';
                return 'paragraph';
            case 'bulletList': return 'bulletList';
            case 'orderedList': return 'orderedList';
            case 'v2Task': return 'task';
            case 'blockquote': return 'quote';
            case 'codeBlock': return 'code';
            case 'v2PageLink': return 'subpage';
            default: return null;
        }
    } catch {
        return null;
    }
}