"use client";

import Link from "next/link";
import { ErrorState } from "@/components/ui/states";
import { buttonStyles } from "@/components/ui/button";
import { CalendarIcon, HomeIcon } from "@/components/icons";

/**
 * Error boundary for the event editor.
 *
 * The page throws deliberately in one case: the stored row no longer satisfies
 * the current validation schema — a record seeded before a rule was tightened,
 * or edited outside the app. That is a real operational problem, not a bug to
 * hide, so the message says what happened instead of showing a bare "something
 * went wrong".
 */
export default function EditEventError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const schemaDrift = error.message.includes("no longer satisfy the event schema");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <ErrorState
        title={schemaDrift ? "This event has inconsistent data" : "The event could not be loaded"}
        description={
          schemaDrift
            ? error.message
            : error.message ||
              "The event could not be read from the database. This is usually temporary — try again."
        }
        onRetry={schemaDrift ? undefined : reset}
        className="py-12"
      />

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/admin/events" className={buttonStyles({ variant: "primary" })}>
          <CalendarIcon className="size-4" />
          Back to all events
        </Link>
        <Link href="/admin" className={buttonStyles({ variant: "secondary" })}>
          <HomeIcon className="size-4" />
          Dashboard
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 text-center font-mono text-body-sm text-meta">Reference: {error.digest}</p>
      )}
    </div>
  );
}
