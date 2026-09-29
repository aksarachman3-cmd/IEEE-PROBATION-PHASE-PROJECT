"use client";

import { ErrorState } from "@/components/ui/states";

/**
 * Route-level error boundary for the admin console.
 *
 * Catches anything thrown during rendering — including the database being
 * unreachable — and shows a recoverable message instead of the framework's
 * blank error page. `reset()` re-runs the server component, so a transient
 * database hiccup can be retried without a full reload.
 *
 * Note this only covers the segment below the boundary. The admin *layout* has
 * its own boundary, so a failure in the shell is reported separately.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        title="The console could not load"
        description={
          error.message ||
          "An unexpected error occurred while loading the admin console. This is usually a temporary database problem."
        }
        onRetry={reset}
        className="py-16"
      />

      {error.digest && (
        <p className="mt-4 text-center font-mono text-body-sm text-meta">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
