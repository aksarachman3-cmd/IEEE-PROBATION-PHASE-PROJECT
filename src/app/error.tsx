"use client";

import { ErrorState } from "@/components/ui/states";

/**
 * Root error boundary.
 *
 * Deliberately minimal and dependency-free: if this component itself fails
 * there is nothing left to render a fancy message with, so it is plain
 * markup with no images, fonts or client state.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <ErrorState
        title="Something went wrong"
        description={
          error.message ||
          "An unexpected error occurred. Reloading the page usually clears it."
        }
        onRetry={reset}
        className="w-full max-w-lg"
      />
      {error.digest && (
        <p className="mt-4 font-mono text-body-sm text-meta">Reference: {error.digest}</p>
      )}
    </main>
  );
}
