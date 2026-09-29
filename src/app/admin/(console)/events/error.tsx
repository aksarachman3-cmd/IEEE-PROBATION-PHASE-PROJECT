"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { buttonStyles } from "@/components/ui/button";
import { CalendarIcon, HomeIcon } from "@/components/icons";

/**
 * Error boundary for the admin event list.
 *
 * The console-wide boundary in `admin/(console)/error.tsx` would also catch
 * this, but it replaces the whole page. The list is the screen an admin sits on
 * while working, so it gets its own boundary: a failed query here leaves the
 * rest of the console navigable instead of dropping the admin onto a dead page
 * with no way back except the browser.
 */
export default function AdminEventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        title="The event list could not be loaded"
        description={
          error.message ||
          "The events could not be read from the database. This is usually temporary — try again, and if it persists check that the database file is accessible."
        }
        onRetry={reset}
        className="py-12"
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/admin" className={buttonStyles({ variant: "secondary" })}>
          <HomeIcon className="size-4" />
          Dashboard
        </Link>
        <Link href="/admin/events/new" className={buttonStyles({ variant: "primary" })}>
          <CalendarIcon className="size-4" />
          Create event
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-center font-mono text-body-sm text-meta">Reference: {error.digest}</p>
      )}
    </div>
  );
}
