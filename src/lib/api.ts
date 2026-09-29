import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, statusForCode, type ErrorCode } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/**
 * Uniform JSON envelope for every `/api/*` response:
 *
 *   success → { "ok": true,  "data": …, "meta"?: … }
 *   failure → { "ok": false, "error": { "code", "message", "details"? } }
 *
 * The client can therefore branch on a single boolean instead of guessing from
 * status codes, and the frontend error states get a real message to show.
 */
export type ApiEnvelope<T> =
  | { ok: true; data: T; meta?: Record<string, unknown> }
  | { ok: false; error: { code: ErrorCode; message: string; details?: Record<string, string[]> } };

export function apiOk<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: ApiEnvelope<T> = meta ? { ok: true, data, meta } : { ok: true, data };
  return NextResponse.json(body, { status });
}

export function apiError(
  code: ErrorCode,
  message: string,
  details?: Record<string, string[]>,
  status?: number,
) {
  const body: ApiEnvelope<never> = {
    ok: false,
    error: details ? { code, message, details } : { code, message },
  };
  // Status always derives from the code, so a FORBIDDEN can never be reported as
  // a 500 and cause clients to retry an action that will never succeed.
  return NextResponse.json(body, { status: status ?? statusForCode(code) });
}

/** Flatten a ZodError into `{ field: [messages] }`. */
export function zodFieldErrors(error: ZodError): Record<string, string[]> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const result: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) result[key] = messages;
  }
  return result;
}

/**
 * Map any thrown value onto a safe HTTP response.
 * Unknown errors are logged server-side and reported as a generic 500.
 */
export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return apiError(error.code, error.message, error.details, error.status);
  }

  if (error instanceof ZodError) {
    return apiError("VALIDATION_ERROR", "Some fields need attention.", zodFieldErrors(error), 422);
  }

  if (isPrismaError(error)) {
    // P2002 = unique constraint, P2025 = record required by the update did not exist.
    if (error.code === "P2002") {
      return apiError("CONFLICT", "That value is already taken. Please use a different one.");
    }
    if (error.code === "P2025") {
      return apiError("NOT_FOUND", "The requested record no longer exists.");
    }
  }

  console.error("[api] Unhandled error:", error);
  return apiError("INTERNAL_ERROR", "Something went wrong on our side. Please try again.");
}

function isPrismaError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/**
 * Wrap a route handler so thrown errors become the standard error envelope.
 *
 *   export const GET = route(async (req) => apiOk(await listEvents()));
 */
export function route<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Convenience re-export so services can assert the database is reachable. */
export async function assertDatabaseReachable(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new AppError(
      "INTERNAL_ERROR",
      "Could not reach the database. Check that DATABASE_URL is set and migrations have been applied.",
    );
  }
}
