'use client';

import React from 'react';

/** Pulsing placeholder block. Use directly or compose into larger skeletons. */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

/** A row that mimics a TaskItem: checkbox circle + text line + optional date badge */
export function TaskRowSkeleton({ showDate = false }: { showDate?: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
      <Skeleton className="h-4 flex-1" />
      {showDate && <Skeleton className="w-16 h-5 rounded flex-shrink-0" />}
    </div>
  );
}

/** 5 skeleton task rows */
export function TaskListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <TaskRowSkeleton key={i} showDate={i % 2 === 0} />
      ))}
    </div>
  );
}

/** Matches the page view loading: title bar + content blocks */
export function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto pt-8 px-4 md:px-8 space-y-6">
      {/* Header row: breadcrumbs + actions */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-1">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
          <Skeleton className="w-9 h-9 rounded-lg" />
        </div>
      </div>
      {/* Title */}
      <Skeleton className="h-10 w-2/3 mb-4" />
      {/* Content blocks */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <div className="pt-4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
