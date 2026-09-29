import { apiError, apiOk, route } from "@/lib/api";
import { flattenIssues } from "@/lib/api-helpers";
import { getEventById, deleteEvent, updateEvent } from "@/lib/services/event-service";
import { requireAdminApi } from "@/lib/auth/guard";
import { eventFormSchema } from "@/lib/validation/event";

/**
 * Single event resource.
 *
 *  GET    /api/events/:id   read one       (public read)
 *  PATCH  /api/events/:id   partial update (admin)
 *  DELETE /api/events/:id   delete         (admin)
 *
 * `GET` uses the public scope, so a draft, archived or cancelled event returns
 * `404` rather than `403` — otherwise the endpoint would confirm that an
 * unpublished slug exists.
 *
 * `PATCH` merges the body onto the current row and validates the *merged
 * result*, which is what keeps the cross-field rules (end ≥ start, attendees ≤
 * capacity) from being bypassed by a one-field edit.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const GET = route(async (_request: Request, context: RouteContext) => {
  const { id } = await context.params;
  const event = await getEventById(id, "public");

  if (!event) {
    return apiError("NOT_FOUND", "Event not found.", undefined, 404);
  }
  return apiOk(event);
});

export const PATCH = route(async (request: Request, context: RouteContext) => {
  await requireAdminApi();
  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", undefined, 400);
  }

  const existing = await getEventById(id, "admin");
  if (!existing) {
    return apiError("NOT_FOUND", "Event not found.", undefined, 404);
  }

  // Ignore server-owned fields so a client cannot rewrite ownership or audit
  // timestamps by including them in the body. The destructured keys are
  // discarded on purpose — only what is left is validated and written.
  const SERVER_OWNED_FIELDS = ["id", "slug", "createdById", "createdAt", "updatedAt"] as const;
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if ((SERVER_OWNED_FIELDS as readonly string[]).includes(key)) continue;
    changes[key] = value;
  }

  const parsed = eventFormSchema.safeParse({ ...existing, ...changes });
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Some fields need attention.", flattenIssues(parsed.error), 422);
  }

  const event = await updateEvent(id, parsed.data);
  return apiOk(event);
});

export const DELETE = route(async (_request: Request, context: RouteContext) => {
  await requireAdminApi();
  const { id } = await context.params;

  const event = await deleteEvent(id);
  return apiOk({ id: event.id, slug: event.slug, deleted: true });
});
