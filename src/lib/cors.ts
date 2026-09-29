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

/**
 * The origin to echo back, or `null` to send no `Access-Control-Allow-Origin`.
 *
 * With an allow-list configured, a request from an origin that is *not* on it
 * gets no header at all. Falling back to the first allowed origin would still be
 * blocked by the browser, but it advertises an origin the caller does not hold
 * and makes a denial look like a success when inspecting the response.
 *
 * A request with no `Origin` header (same-origin, curl, server-to-server) is
 * not a cross-origin request, so it is allowed through.
 */
function allowOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (ALLOWED_ORIGINS.length > 0) {
    if (!origin) return ALLOWED_ORIGINS[0];
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
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
    const origin = allowOrigin(request);
    if (origin) response.headers.set("Access-Control-Allow-Origin", origin);
    for (const [key, value] of Object.entries(BASE_HEADERS)) {
      response.headers.set(key, value);
    }
    return response;
  };
}

/** Standard 204 preflight response. */
export function handleCorsPreflight(request: Request): NextResponse {
  const origin = allowOrigin(request);
  return new NextResponse(null, {
    status: 204,
    // A denied origin gets a bare 204 with no allow header, so the browser
    // fails the preflight instead of proceeding and failing the real request.
    headers: { ...(origin ? { "Access-Control-Allow-Origin": origin } : {}), ...BASE_HEADERS },
  });
}
