import type { Route } from "next";

/**
 * Redirect-target safety.
 *
 * Lives outside `app/actions/auth.ts` because that file has the `"use server"`
 * directive, which requires every export to be an async function — a plain
 * helper cannot be exported from there.
 */

/**
 * Sanitise a `next` value coming from the query string.
 *
 * Guards against open redirect: only same-origin relative paths are honoured,
 * so `?next=https://evil.example` and `?next=//evil.example` both fall back to
 * the dashboard instead of sending the admin off-site after signing in.
 * Backslashes and colons are rejected as well, since some browsers normalise
 * them into an authority (`/\evil.example`).
 */
export function safeNextPath(value: string | string[] | undefined): Route {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) return "/admin";
  if (!candidate.startsWith("/")) return "/admin";
  if (candidate.startsWith("//")) return "/admin";
  if (candidate.includes("\\") || candidate.includes(":")) return "/admin";
  if (candidate.includes("\n") || candidate.includes("\r")) return "/admin";

  // Safe to cast: the checks above have already excluded any absolute URL,
  // protocol-relative path or header-injection attempt, so what remains is a
  // same-origin relative path.
  return candidate as Route;
}
