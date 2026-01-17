import { useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Node } from '@tiptap/pm/model';
import { parseTaskDate } from '../lib/taskParser';

interface UseTaskParserProps {
  node: Node;
  editor: Editor;
  getPos: () => number;
  updateAttributes: (attrs: Record<string, any>) => void;
  isEditable?: boolean;
}

export const useTaskParser = ({ 
  node, 
  editor, 
  getPos,
  updateAttributes,
  isEditable = true 
}: UseTaskParserProps) => {
  const lastContentRef = useRef(node.textContent);
  
  useEffect(() => {
    if (!isEditable || !editor) return;

    const currentContent = node.textContent;

    // Optimization: Only run if content actually changed
    if (currentContent === lastContentRef.current) return;
    lastContentRef.current = currentContent;

    // Regex to match @date pattern at end of string
    // Matches @today, @tomorrow, @2024-01-01, etc.
    const match = currentContent.match(/@(.+)$/);
    
    if (match) {
        const potentialDate = match[1];
        const parsedDate = parseTaskDate(potentialDate);
        
        if (parsedDate) {
            // Valid date found!
            
            // 1. Update the task attribute
            updateAttributes({ 
                due_date: parsedDate 
            });

            // 2. Remove the @date text from the editor content
            // We need to be careful to calculate exact positions
            const matchIndex = match.index!;
            const matchLength = match[0].length;
            
            // Calculate absolute positions in the document
            const nodeStartPos = getPos();
            
            // +1 because node start is before the content
            const deleteStart = nodeStartPos + 1 + matchIndex;
            const deleteEnd = deleteStart + matchLength;

            // Schedule the deletion to happen immediately
            // We use setTimeout 0 to let the current transaction finish if needed, 
            // though synchronous dispatch is usually fine in Tiptap unless inside a specific lifecycle.
            // Using requestAnimationFrame/setTimeout avoids "flushSync" issues during render.
            requestAnimationFrame(() => {
                editor.commands.deleteRange({
                    from: deleteStart,
                    to: deleteEnd
                });
            });
        }
    }
  }, [node.textContent, editor, getPos, updateAttributes, isEditable]);
};
