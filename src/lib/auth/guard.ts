import "server-only";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { forbidden, unauthenticated } from "@/lib/errors";

/**
 * Authorisation helpers.
 *
 * Two flavours, because the two call sites want different behaviour:
 *  • `requireAdminPage` — for Server Components. Sends the browser to the
 *    sign-in page (preserving where it was going) instead of throwing.
 *  • `requireAdminApi`   — for Route Handlers. Throws `AppError`, which the
 *    error boundary turns into a 401 JSON response.
 */

/** Resolve the current session, or `null` when signed out. */
export async function getOptionalAdmin(): Promise<SessionUser | null> {
  return getSession();
}

/** Guard for pages under `/admin`. Redirects to sign-in when unauthenticated. */
export async function requireAdminPage(returnTo?: string): Promise<SessionUser> {
  const session = await getSession();
  if (session) return session;

  // The `next` value is a path this app produced, but it is re-validated on the
  // sign-in page before it is ever followed.
  const target: Route = returnTo
    ? `/admin/login?next=${encodeURIComponent(returnTo)}`
    : "/admin/login";
  redirect(target);
}

/** Guard for `/api/*` routes that mutate data. */
export async function requireAdminApi(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw unauthenticated();
  if (session.role !== "ADMIN") {
    throw forbidden("This action requires an administrator account.");
  }
  return session;
}

/** Only an admin may sign in — kept as an explicit check for clarity at the call site. */
export function assertAdmin(user: SessionUser): void {
  if (user.role !== "ADMIN") {
    throw forbidden("This action requires an administrator account.");
  }
}
