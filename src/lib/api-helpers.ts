import "server-only";

import type { ZodError } from "zod";

/**
 * Helpers shared by the JSON API routes.
 *
 * These live in `lib` rather than being exported from a `route.ts` file,
 * because Next treats non-handler exports from a route module as invalid.
 */

/** Turn a ZodError into `{ field: [messages] }` for the error envelope. */
export function flattenIssues(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    const key = typeof field === "string" ? field : "_form";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}
