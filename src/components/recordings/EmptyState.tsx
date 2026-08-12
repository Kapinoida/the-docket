import { Radio } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-bg-tertiary">
        <Radio className="h-8 w-8 text-text-muted" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-text-primary">No recordings scheduled</h3>
      <p className="mt-2 text-sm text-text-muted">
        Recordings will appear here when scheduled by the fixture scheduler or manually added.
      </p>
      <div className="mt-6">
        <p className="text-xs text-text-muted">
          Check the Hermes scripts to ensure recordings are being scheduled correctly.
        </p>
      </div>
    </div>
  );
}
