import { NextResponse } from "next/server";
import { apiError, assertDatabaseReachable } from "@/lib/api";
import { handleCorsPreflight, withCors } from "@/lib/cors";

/**
 * API health check.
 *
 * Used by the README's verification steps and by anyone deploying the app to
 * confirm the database connection actually works. Deliberately unauthenticated
 * and deliberately reveals nothing beyond service liveness.
 */
export const dynamic = "force-dynamic";

export const GET = withCors(async () => {
  try {
    await assertDatabaseReachable();
  } catch {
    return apiError("INTERNAL_ERROR", "Database is unreachable.", undefined, 503);
  }

  return NextResponse.json({
    ok: true,
    data: { status: "healthy", database: "connected", time: new Date().toISOString() },
  });
});

export const OPTIONS = handleCorsPreflight;
