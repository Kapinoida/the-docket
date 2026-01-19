import React from 'react';
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
    Code
} from 'lucide-react';

export type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'bulletList' | 'orderedList' | 'task' | 'subpage' | 'quote' | 'code';

interface BlockTypePopoverProps {
    onSelect: (type: BlockType) => void;
    onClose: () => void;
    position?: { top?: number; left?: number; right?: number; bottom?: number };
}

export function BlockTypePopover({ onSelect, onClose, position }: BlockTypePopoverProps) {
    const options: { type: BlockType; label: string; icon: any; description: string }[] = [
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

    return (
        <div 
            className="absolute z-50 bg-bg-primary border border-border-default rounded-xl shadow-2xl w-[280px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            style={position ? { ...position } : {}}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-2 border-b border-border-subtle bg-bg-secondary/50">
                <span className="text-xs font-semibold text-text-muted px-2">Turn into</span>
                <button onClick={onClose} className="p-1 hover:bg-bg-tertiary rounded text-text-muted transition-colors">
                    <X size={14} />
                </button>
            </div>
            
            <div className="p-1 max-h-[300px] overflow-y-auto">
                {options.map((option) => (
                    <button
                        key={option.type}
                        onClick={() => onSelect(option.type)}
                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-bg-tertiary text-left transition-colors group"
                    >
                        <div className="w-8 h-8 rounded border border-border-default bg-bg-secondary flex items-center justify-center text-text-secondary group-hover:border-border-hover group-hover:text-text-primary transition-colors">
                            <option.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-text-primary">{option.label}</div>
                            <div className="text-xs text-text-muted truncate">{option.description}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
