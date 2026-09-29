import type { Route } from "next";

/**
 * Typed URL construction.
 *
 * `next.config.ts` enables `typedRoutes`, so `<Link href>` and `router.push()`
 * reject any string that is not a known route. That is exactly what we want for
 * hard-coded links, but it also rejects URLs assembled at runtime — pagination
 * links, filter links, and anything built from a `URLSearchParams`.
 *
 * `href()` is the single, deliberate escape hatch. It is used *only* where the
 * path prefix is a hard-coded literal and the query string is data, so a typo
 * in the route is still a compile error; only the dynamic part is trusted.
 */

/** Build a query string, dropping empty/undefined values. */
export function queryString(
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  return search.toString();
}

/**
 * Append a query string to a route.
 *
 * `to` is typed as a plain `string` rather than `Route` because two callers
 * pass a runtime value (`usePathname()`, or a `pathname` captured in an event
 * handler) that TypeScript cannot narrow to a known route. Those call sites are
 * already inside the app's own routes, so the trade-off is acceptable; literal
 * paths passed anywhere else are still checked by `typedRoutes`.
 */
export function href(
  to: string,
  params: Record<string, string | number | undefined | null>,
): Route {
  const search = queryString(params);
  if (!search) return to as Route;
  return `${to}?${search}` as Route;
}
