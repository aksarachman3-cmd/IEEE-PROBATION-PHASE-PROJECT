import { apiError, apiOk, route } from "@/lib/api";
import { flattenIssues } from "@/lib/api-helpers";
import { handleCorsPreflight, withCors } from "@/lib/cors";
import { createEvent, listEvents } from "@/lib/services/event-service";
import { requireAdminApi } from "@/lib/auth/guard";
import { eventFormSchema, eventQuerySchema } from "@/lib/validation/event";

/**
 * Event collection endpoint.
 *
 *  GET  /api/events   list, filter and paginate (public read)
 *  POST /api/events   create            (admin)
 *
 * Reads use the *public* scope, so a draft or archived event is simply absent
 * from the list rather than being filtered out client-side.
 *
 * Per-member routes (`/api/events/:id`) live in the `[id]` folder.
 */
export const dynamic = "force-dynamic";

export const GET = withCors(
  route(async (request: Request) => {
    const url = new URL(request.url);
    const parsed = eventQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

    if (!parsed.success) {
      return apiError(
        "VALIDATION_ERROR",
        "One or more query parameters are invalid.",
        flattenIssues(parsed.error),
        400,
      );
    }

    const result = await listEvents(parsed.data, "public");

    return apiOk(result.events, {
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    });
  }),
);

export const POST = route(async (request: Request) => {
  const admin = await requireAdminApi();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", undefined, 400);
  }

  const parsed = eventFormSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Some fields need attention.", flattenIssues(parsed.error), 422);
  }

  const event = await createEvent(parsed.data, admin.id);
  return apiOk(event, undefined, 201);
});

export const OPTIONS = handleCorsPreflight;
