import { NextResponse } from "next/server";

/**
 * CORS for the public read-only API.
 *
 * The catalog is intentionally readable by anyone, including a front-end app
 * on another origin, so `GET` responses get a permissive `Access-Control-Allow-Origin`.
 *
 * Credentials are never allowed, and the allowed methods exclude the mutating
 * verbs. Combined with the fact that every mutation additionally requires an
 * httpOnly session cookie, this means a third-party origin cannot drive the
 * admin API with a visitor's ambient credentials.
 */

const ALLOWED_ORIGINS = (process.env.API_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** `*` when no allow-list is configured (the default for the public catalog). */
function allowOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    return ALLOWED_ORIGINS[0];
  }
  return "*";
}

const BASE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

/**
 * Adds CORS headers to a public, credential-free response.
 *
 * Accepts any handler returning a `Response` (not just `NextResponse`) so it
 * composes cleanly with the `route()` error wrapper, which is typed in terms of
 * the base `Response`.
 */
export function withCors<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    const response = await handler(request, ...args);
    response.headers.set("Access-Control-Allow-Origin", allowOrigin(request));
    for (const [key, value] of Object.entries(BASE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  };
}

/** Standard 204 preflight response. */
export function handleCorsPreflight(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": allowOrigin(request),
      ...BASE_HEADERS,
    },
  });
}
