"use client";

import Link from "next/link";
import type { Route } from "next";
import { ErrorState } from "@/components/ui/states";
import { buttonStyles } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { CalendarIcon } from "@/components/icons";

/**
 * Error boundary for the sign-in page.
 *
 * The login page lives outside the `(console)` route group, so it is not
 * covered by the console's error boundary and would otherwise fall all the way
 * through to the root one. That matters here: the root boundary renders a bare
 * page with no logo and no link home, which is a poor first impression on the
 * one screen that must always work.
 */
export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const home = "/" as Route;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Logo className="mb-8" />

        <ErrorState
          title="Sign-in is unavailable"
          description={
            error.message ||
            "We could not reach the session store, so signing in is not possible right now. Please try again in a moment."
          }
          onRetry={reset}
          className="py-10"
        />

        <div className="mt-8 flex justify-center">
          <Link href={home} className={buttonStyles({ variant: "secondary" })}>
            <CalendarIcon className="size-4" />
            Go to the public catalog
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-center font-mono text-body-sm text-meta">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
