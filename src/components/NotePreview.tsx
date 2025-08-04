'use client';

import RichTextEditor from './RichTextEditor';

interface NotePreviewProps {
  content: string;
  className?: string;
}

export default function NotePreview({ content, className = '' }: NotePreviewProps) {
  return (
    <div className={className}>
      <RichTextEditor
        content={content}
        onChange={() => {}} // No-op for read-only
        readOnly={true}
        className="border-none"
      />
    </div>
  );
}