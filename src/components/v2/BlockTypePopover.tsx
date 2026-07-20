import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Type,
    Heading1,
    Heading2,
    List,
    ListOrdered,
    CheckSquare,
    FileText,
    X,
    Quote,
    Code,
    Check
} from 'lucide-react';

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'bulletList' | 'orderedList' | 'task' | 'subpage' | 'quote' | 'code';

interface BlockTypePopoverProps {
    onSelect: (type: BlockType) => void;
    onClose: () => void;
    position?: { top?: number; left?: number; right?: number; bottom?: number };
    currentType?: BlockType | null;
}

interface BlockOption {
    type: BlockType;
    label: string;
    icon: any;
    description: string;
}

const OPTIONS: BlockOption[] = [
    { type: 'paragraph', label: 'Text', icon: Type, description: 'Just start writing with plain text.' },
    { type: 'heading1', label: 'Heading 1', icon: Heading1, description: 'Big section heading.' },
    { type: 'heading2', label: 'Heading 2', icon: Heading2, description: 'Medium section heading.' },
    { type: 'bulletList', label: 'Bullet List', icon: List, description: 'Create a simple bulleted list.' },
    { type: 'orderedList', label: 'Ordered List', icon: ListOrdered, description: 'Create a list with numbering.' },
    { type: 'task', label: 'Task', icon: CheckSquare, description: 'Track tasks with a to-do list.' },
    { type: 'subpage', label: 'Sub-page', icon: FileText, description: 'Link to a page inside this page.' },
    { type: 'quote', label: 'Quote', icon: Quote, description: 'Capture a quote.' },
    { type: 'code', label: 'Code', icon: Code, description: 'Capture a code snippet.' },
];

export function BlockTypePopover({ onSelect, onClose, position, currentType }: BlockTypePopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [adjustedPosition, setAdjustedPosition] = useState(position || {});

    // Boundary detection: adjust position if popover would overflow viewport
    useEffect(() => {
        if (!popoverRef.current || !position) return;
        const rect = popoverRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const adjusted = { ...position };

        // If popover overflows bottom, flip to above
        if (rect.bottom > viewportHeight - 8) {
            // Place above the trigger instead
            adjusted.top = undefined;
            adjusted.bottom = 8;
        }

        // If popover overflows right, shift left
        if (rect.right > viewportWidth - 8) {
            adjusted.left = undefined;
            adjusted.right = 8;
        }

        setAdjustedPosition(adjusted);
    }, [position]);

    // Escape key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Click outside to close (handled by parent typically, but add as safety net)
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        // Delay to avoid the opening click immediately closing it
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleMouseDown);
        }, 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [onClose]);

    const popover = (
        <div
            ref={popoverRef}
            className="fixed z-[9999] bg-bg-primary border border-border-default rounded-xl shadow-2xl w-[280px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={adjustedPosition}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-2 border-b border-border-subtle bg-bg-secondary/50">
                <span className="text-xs font-semibold text-text-muted px-2">Turn into</span>
                <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded text-text-muted transition-colors" aria-label="Close">
                    <X size={14} />
                </button>
            </div>

            <div className="p-1 max-h-[300px] overflow-y-auto">
                {OPTIONS.map((option) => {
                    const isActive = currentType === option.type;
                    return (
                        <button
                            key={option.type}
                            onClick={() => onSelect(option.type)}
                            className={`w-full flex items-center gap-3 p-2 rounded text-left transition-colors group ${
                                isActive ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-bg-tertiary'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded border flex items-center justify-center transition-colors ${
                                isActive
                                    ? 'border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-border-default bg-bg-secondary text-text-secondary group-hover:border-border-hover group-hover:text-text-primary'
                            }`}>
                                <option.icon size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text-primary">{option.label}</div>
                                <div className="text-xs text-text-muted truncate">{option.description}</div>
                            </div>
                            {isActive && (
                                <Check size={16} className="text-blue-500 dark:text-blue-400 flex-shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Use portal to avoid clipping by parent overflow containers
    return createPortal(popover, document.body);
}