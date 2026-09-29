import { apiError, apiOk, route } from "@/lib/api";
import { handleCorsPreflight } from "@/lib/cors";
import { requireAdminApi } from "@/lib/auth/guard";
import { getEventById, updateEventImage } from "@/lib/services/event-service";
import { deleteStoredImage, saveEventImage } from "@/lib/uploads";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

/**
 * Event cover image.
 *
 *  POST   /api/events/:id/image   multipart/form-data, field `image` → stores
 *                                 the file and points the event at it
 *  DELETE /api/events/:id/image   clears the cover and removes the file
 *
 * Kept separate from `PATCH /api/events/:id` because a cover arrives as
 * `multipart/form-data`, not JSON, and mixing the two would mean every text
 * field had to survive a round-trip through `multipart` parsing just to change
 * one URL.
 *
 * Ordering matters here. The file is written *before* the row is updated, and
 * rolled back if the write fails — the reverse order would leave the event
 * pointing at a path that does not exist yet. The previous cover is only
 * unlinked once the row no longer references it.
 */
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: RouteContext) => {
  await requireAdminApi();
  const { id } = await context.params;

  const existing = await getEventById(id, "admin");
  if (!existing) {
    return apiError("NOT_FOUND", "Event not found.", undefined, 404);
  }

  // Reject on the declared length before parsing the body, so an oversized
  // upload is refused without being buffered into memory first.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_BYTES) {
    return apiError(
      "PAYLOAD_TOO_LARGE",
      `Image is larger than the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError(
      "UNSUPPORTED_MEDIA_TYPE",
      "Send the image as multipart/form-data with a field named `image`.",
      undefined,
      415,
    );
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return apiError(
      "VALIDATION_ERROR",
      "Attach a file in the `image` field.",
      { image: ["Choose an image to upload."] },
      422,
    );
  }

  // `saveEventImage` throws AppError for a bad type, size or signature; the
  // `route()` wrapper turns that into the standard error envelope.
  const stored = await saveEventImage(file);

  try {
    const event = await updateEventImage(id, stored.url);
    // The row no longer references the old cover, so it is safe to remove.
    await deleteStoredImage(existing.imageUrl);
    return apiOk({ id: event.id, imageUrl: event.imageUrl });
  } catch (error) {
    // Nothing was persisted, so the file we just wrote is unreferenced.
    await deleteStoredImage(stored.url);
    throw error;
  }
});

export const DELETE = route(async (_request: Request, context: RouteContext) => {
  await requireAdminApi();
  const { id } = await context.params;

  const existing = await getEventById(id, "admin");
  if (!existing) {
    return apiError("NOT_FOUND", "Event not found.", undefined, 404);
  }

  if (!existing.imageUrl) {
    return apiError("NOT_FOUND", "This event does not have a cover image.", undefined, 404);
  }

  const previous = existing.imageUrl;
  const event = await updateEventImage(id, null);
  // Only unlink after the row is committed, so a failure above leaves the
  // event pointing at a file that still exists.
  await deleteStoredImage(previous);

  return apiOk({ id: event.id, imageUrl: null });
});

export const OPTIONS = handleCorsPreflight;
