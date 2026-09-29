import { apiError, apiOk, route } from "@/lib/api";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { authenticate } from "@/lib/services/auth-service";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";

/**
 * Programmatic authentication for API clients.
 *
 * All three verbs live on this single resource, distinguished by method rather
 * than by sub-path:
 *
 *  POST   /api/auth   { email, password } → verifies and sets the session cookie
 *  GET    /api/auth   the current session, or `401` when signed out
 *  DELETE /api/auth   revokes the session and clears the cookie
 *
 * The browser UI uses a Server Action instead; this exists so the API is
 * usable on its own (curl, Postman, a separate front-end). Both paths share
 * `authenticate()` and `createSession()`, so credentials are verified the same
 * way either way.
 */
export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", undefined, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const details: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (typeof field !== "string") continue;
      (details[field] ??= []).push(issue.message);
    }
    return apiError("VALIDATION_ERROR", "Email and password are required.", details, 422);
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // Same message for unknown email and wrong password, so the endpoint
    // cannot be used to enumerate admin accounts.
    return apiError("UNAUTHENTICATED", "Incorrect email or password.", undefined, 401);
  }

  await createSession(result.user.id);
  return apiOk({ user: result.user });
});

export const GET = withCors(
  route(async () => {
    const session = await getSession();
    if (!session) {
      return apiError("UNAUTHENTICATED", "Not signed in.", undefined, 401);
    }
    return apiOk({ user: session });
  }),
);

export const DELETE = route(async () => {
  await destroySession();
  return apiOk({ signedOut: true });
});

export const OPTIONS = handleCorsPreflight;
