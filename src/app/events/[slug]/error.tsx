"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { buttonStyles } from "@/components/ui/button";
import { CalendarIcon } from "@/components/icons";

/**
 * Error boundary for the public event detail route.
 *
 * The root `error.tsx` already covers this, but it renders without the site
 * header/footer, so a single database hiccup would drop a visitor out of the
 * site chrome entirely. Catching it here keeps the failure scoped to the
 * article body, which is the only part that actually failed.
 *
 * A missing event is deliberately *not* handled here — `notFound()` renders
 * `not-found.tsx` instead, because "this event does not exist" and "this event
 * failed to load" are different answers and conflating them misleads a visitor
 * who followed a valid link.
 */
export default function EventDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        title="This event could not be loaded"
        description={
          error.message ||
          "Something went wrong on our side while loading the event. It is often temporary — please try again."
        }
        onRetry={reset}
        className="py-12"
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonStyles({ variant: "primary" })}>
          <CalendarIcon className="size-4" />
          Back to the catalog
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-center font-mono text-body-sm text-meta">Reference: {error.digest}</p>
      )}
    </div>
  );
}
