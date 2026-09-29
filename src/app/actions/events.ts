"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireAdminApi } from "@/lib/auth/guard";
import { AppError, errorMessage, type ErrorCode } from "@/lib/errors";
import { createEvent, deleteEvent, getEventById, updateEvent } from "@/lib/services/event-service";
import { deleteStoredImage, saveEventImage } from "@/lib/uploads";
import { eventFormSchema, type EventFormValues } from "@/lib/validation/event";

/**
 * Server Actions for event mutations.
 *
 * Every action re-checks authorisation on the server via `requireAdminApi` —
 * hiding a button in the UI is not an access control. Validation runs through
 * the same Zod schema as the REST API, so the two paths cannot drift.
 */

export type FormState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      code?: ErrorCode;
      /** Field name → first message, rendered under each input. */
      fieldErrors?: Partial<Record<keyof EventFormValues, string>>;
    }
  | { status: "success"; message: string };

/**
 * `FormData` → plain object for the Zod schema.
 *
 * Unchecked checkboxes are absent from `FormData` entirely, so they are added
 * back as `false` — otherwise omitting the box would leave the field
 * `undefined` and fail validation instead of meaning "off".
 */
function formDataToValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "image") continue; // handled separately by the upload step
    values[key] = value;
  }

  if (!("isFeatured" in values)) values.isFeatured = false;
  return values;
}

/** Outcome of the upload step: the new URL, plus what to clean up and when. */
type ResolvedImage = {
  /** Value to persist on the event row. */
  imageUrl: string | null;
  /** The file written by *this* request, if any — to roll back on failure. */
  stagedUrl: string | null;
  /** The file this request *replaced*, to delete only once the row is saved. */
  replacedUrl: string | null;
};

/**
 * Persist an uploaded cover image, if one was submitted.
 *
 * Nothing is deleted here. The previous image is only removed *after* the
 * database write succeeds, and the newly written file is removed if it fails —
 * otherwise a failed update would leave the event pointing at a file that has
 * already been unlinked.
 */
async function resolveImageUrl(formData: FormData, currentUrl: string | null): Promise<ResolvedImage> {
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { imageUrl: currentUrl, stagedUrl: null, replacedUrl: null };
  }

  const stored = await saveEventImage(file);
  return { imageUrl: stored.url, stagedUrl: stored.url, replacedUrl: currentUrl };
}

/** Remove a file only if it lives under our own uploads directory. */
async function discard(url: string | null): Promise<void> {
  if (!url) return;
  try {
    await deleteStoredImage(url);
  } catch (error) {
    // A leftover file is cosmetic; never fail a save because cleanup did.
    console.error("[events] Could not remove image", url, error);
  }
}

function toFieldErrors(error: ZodError): Partial<Record<keyof EventFormValues, string>> {
  const fieldErrors: Partial<Record<keyof EventFormValues, string>> = {};

  // Walk `issues` rather than `flatten().fieldErrors`: `flatten` only reports
  // the first error per field and loses anything raised by `superRefine` that
  // is nested. Reading `issues` directly also survives a future Zod release
  // that changes the shape of `flatten()`.
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue; // form-level error, not a field
    const key = field as keyof EventFormValues;
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }

  return fieldErrors;
}

/** Create a new event. */
export async function createEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Resolve the author once, and authorise before touching the database.
  const admin = await requireAdminApi();

  const parsed = eventFormSchema.safeParse(formDataToValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Some fields need attention before this event can be saved.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Resolve the upload only after validation passes, so a rejected form never
  // leaves an orphaned file on disk.
  let image: ResolvedImage;
  try {
    image = await resolveImageUrl(formData, null);
  } catch (error) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: errorMessage(error),
      fieldErrors: { imageUrl: errorMessage(error) },
    };
  }

  try {
    const event = await createEvent({ ...parsed.data, imageUrl: image.imageUrl }, admin.id);
    revalidatePath("/admin");
    revalidatePath("/admin/events");
    revalidatePath("/");
    return { status: "success", message: `Created “${event.title}”.` };
  } catch (error) {
    // The row was not created, so the uploaded file is now unreferenced.
    await discard(image.stagedUrl);
    return {
      status: "error",
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      message: errorMessage(error),
    };
  }
}

/** Update an existing event. */
export async function updateEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdminApi();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { status: "error", message: "Missing event id.", code: "VALIDATION_ERROR" };
  }

  const parsed = eventFormSchema.safeParse(formDataToValues(formData));
  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Some fields need attention before this event can be saved.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const existing = await getEventById(id, "admin");
  if (!existing) {
    return { status: "error", code: "NOT_FOUND", message: "That event no longer exists." };
  }

  let image: ResolvedImage;
  try {
    image = await resolveImageUrl(formData, existing.imageUrl);
  } catch (error) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: errorMessage(error),
      fieldErrors: { imageUrl: errorMessage(error) },
    };
  }

  try {
    const event = await updateEvent(id, { ...parsed.data, imageUrl: image.imageUrl });
    // Row now points at the new file, so the one it replaced is safe to remove.
    await discard(image.replacedUrl);
    revalidatePath("/admin");
    revalidatePath("/admin/events");
    revalidatePath("/");
    revalidatePath(`/admin/events/${id}/edit`);
    return { status: "success", message: `Saved changes to “${event.title}”.` };
  } catch (error) {
    // Nothing was written, so undo the file this request created and leave the
    // previous cover exactly where it was.
    await discard(image.stagedUrl);
    return {
      status: "error",
      code: error instanceof AppError ? error.code : "INTERNAL_ERROR",
      message: errorMessage(error),
    };
  }
}

/**
 * Delete an event.
 *
 * Permanent, with no undo: the admin has already confirmed via a dialog. A
 * redirect happens on success so the browser cannot resubmit the action.
 */
export async function deleteEventAction(formData: FormData): Promise<void> {
  await requireAdminApi();

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new AppError("VALIDATION_ERROR", "Missing event id.");
  }

  const existing = await getEventById(id, "admin");
  if (!existing) {
    throw new AppError("NOT_FOUND", "That event no longer exists.");
  }

  await deleteEvent(id);
  // The row is gone, so its cover image is no longer referenced by anything.
  await discard(existing.imageUrl);

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/");
  redirect("/admin/events?deleted=1");
}
