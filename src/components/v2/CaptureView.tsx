'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Inbox, Loader2, PencilLine, TriangleAlert } from 'lucide-react';
import { Task } from '@/types';
import { apiFetch, AuthError } from '@/lib/api';

/**
 * Mobile-first quick capture surface.
 *
 * One text field, one primary action. The captured text becomes a plain Inbox
 * task (no page, no due date, no metadata) through the existing authenticated
 * `POST /api/v2/tasks` route, then the `taskCreated` event lets every other
 * view refresh.
 */

const MAX_LENGTH = 2000;

type CaptureStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function CaptureView() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<CaptureStatus>({ kind: 'idle' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Mobile browsers only honour autofocus on a user gesture, but a desktop
  // browser (and most Android keyboards) will focus the field straight away.
  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // A stale confirmation is confusing once the next thought starts typing.
    setStatus((prev) => (prev.kind === 'success' ? { kind: 'idle' } : prev));
  };

  const submitCapture = async () => {
    const content = value.trim();
    if (!content) {
      setStatus({ kind: 'error', message: 'Type something first, then capture it.' });
      focusInput();
      return;
    }

    setStatus({ kind: 'submitting' });

    try {
      const task = await apiFetch<Task>('/api/v2/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      setValue('');
      setStatus({ kind: 'success', message: 'Captured to your Inbox.' });
      window.dispatchEvent(
        new CustomEvent('taskCreated', { detail: { task, source: 'captureView' } })
      );
      focusInput();
    } catch (error) {
      // `apiFetch` already signalled `auth:expired`; the app shell handles the
      // redirect to /login. Keep the text either way so nothing is lost.
      if (error instanceof AuthError) {
        setStatus({
          kind: 'error',
          message: 'Your session expired. Sign in again to keep capturing.',
        });
        return;
      }
      console.error('Failed to capture task', error);
      setStatus({
        kind: 'error',
        message: "Couldn't capture that — your text is still here. Check your connection and try again.",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitCapture();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submitCapture();
    }
  };

  const isSubmitting = status.kind === 'submitting';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8 md:py-10 font-sans">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <PencilLine size={22} className="text-blue-400" />
          Capture
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Jot it down now — sort it out later in your Inbox.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="capture-input" className="sr-only">
          Capture a thought
        </label>
        <textarea
          id="capture-input"
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={4}
          maxLength={MAX_LENGTH}
          autoFocus
          placeholder="What's on your mind?"
          aria-describedby="capture-help"
          className="w-full resize-y rounded-2xl border border-border-default bg-bg-primary p-4 text-lg text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-muted focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
        <p id="capture-help" className="mt-2 text-xs text-text-muted">
          Tap the microphone on the keyboard to dictate. Captured items land in your
          Inbox — no due date, no project, no fuss.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSubmitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle2 size={18} />
            )}
            {isSubmitting ? 'Capturing…' : 'Capture'}
          </button>

          <Link
            href="/inbox"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border-default bg-bg-secondary px-5 py-3 text-base text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:w-auto"
          >
            <Inbox size={18} />
            Open Inbox
          </Link>
        </div>
      </form>

      {status.kind === 'success' && (
        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-300"
        >
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{status.message}</span>
        </div>
      )}

      {status.kind === 'error' && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}
