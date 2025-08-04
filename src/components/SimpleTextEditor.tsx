'use client';

import { useEffect, useRef } from 'react';

interface SimpleTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export default function SimpleTextEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  readOnly = false
}: SimpleTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full min-h-[200px] resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500"
          style={{ height: 'auto', minHeight: '200px' }}
        />
      </div>
    </div>
  );
}