"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { EventCover } from "@/components/ui/cover";
import { CheckCircleIcon, UploadIcon } from "@/components/icons";
import {
  CATEGORY_META,
  EVENT_CATEGORIES,
  EVENT_FORMATS,
  EVENT_STATUSES,
  FORMAT_META,
  MAX_UPLOAD_BYTES,
  STATUS_META,
  acceptedImageLabel,
  type AcceptedImageType,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/constants";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/image-types";
import { toDateTimeInputValue } from "@/lib/format";
import type { FormState } from "@/app/actions/events";
import type { EditableEvent, EventFormValues } from "@/lib/validation/event";

/**
 * Shared create/edit form.
 *
 * The same component serves both pages so the two can never drift. Rendering
 * is uncontrolled (no per-keystroke `setState`): the browser owns the input
 * values, the server owns validation, and a failed submit simply re-renders
 * with the server's messages. Re-submission preserves what the user typed,
 * because the DOM is never remounted.
 */
export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  event?: EditableEvent;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { status: "idle" });
  const toast = useToast();
  const router = useRouter();
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;
  const formRef = useRef<HTMLFormElement>(null);
  const lastSuccess = useRef<string | null>(null);
  const isCreate = event === undefined;

  // Surface the outcome in a toast as well as inline, so a long form does not
  // hide the result behind a scroll.
  useEffect(() => {
    if (state.status === "success" && lastSuccess.current !== state.message) {
      lastSuccess.current = state.message;
      toast.success(state.message);

      // On create, staying on the page invites an accidental duplicate submit
      // of the very same event. The edit page is the natural next step: it
      // shows the generated permalink and lets the admin refine the draft.
      if (isCreate) router.push("/admin/events?created=1");
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, toast, isCreate, router]);

  // On a validation failure, move focus to the first invalid control so a
  // keyboard or screen-reader user is not left guessing where to look.
  useEffect(() => {
    if (state.status !== "error" || !fieldErrors) return;
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey) return;
    // `imageUrl` is the field name in the error state, but the file input the
    // user actually interacts with is named `image`.
    const control = firstKey === "imageUrl" ? "image" : firstKey;
    const element = formRef.current?.querySelector<HTMLElement>(`[name="${control}"]`);
    element?.focus();
  }, [state, fieldErrors]);

  const err = (key: keyof EventFormValues) => fieldErrors?.[key];

  return (
    <form ref={formRef} action={formAction} className="space-y-6" noValidate>
      {event && <input type="hidden" name="id" value={event.id} />}

      {state.status === "error" && state.message && (
        <Alert tone="danger" title="Could not save">
          {state.message}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Basics */}
          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Event details</legend>

            <Field label="Title" htmlFor="title" required error={err("title")}>
              <Input
                id="title"
                name="title"
                defaultValue={event?.title}
                placeholder="IEEE ITB Student Branch Annual Tech Summit 2026"
                maxLength={120}
                invalid={Boolean(err("title"))}
              />
            </Field>

            <Field
              label="Summary"
              htmlFor="summary"
              required
              hint="One or two sentences shown on the catalog card (max 220 characters)."
              error={err("summary")}
            >
              <Textarea
                id="summary"
                name="summary"
                rows={2}
                defaultValue={event?.summary}
                maxLength={220}
                invalid={Boolean(err("summary"))}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              required
              hint="Leave a blank line between paragraphs."
              error={err("description")}
            >
              <Textarea
                id="description"
                name="description"
                rows={12}
                defaultValue={event?.description}
                invalid={Boolean(err("description"))}
              />
            </Field>
          </fieldset>

          {/* Schedule */}
          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Schedule</legend>
            <p className="-mt-2 text-body-sm text-meta">
              Times are entered and displayed in WIB (UTC+7).
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="startDate" required error={err("startDate")}>
                <Input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  defaultValue={event ? toDateTimeInputValue(event.startDate) : ""}
                  invalid={Boolean(err("startDate"))}
                />
              </Field>

              <Field
                label="Ends"
                htmlFor="endDate"
                hint="Leave blank for a single-day event."
                error={err("endDate")}
              >
                <Input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  defaultValue={event?.endDate ? toDateTimeInputValue(event.endDate) : ""}
                  invalid={Boolean(err("endDate"))}
                />
              </Field>
            </div>
          </fieldset>

          {/* Location */}
          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Location</legend>

            <Field label="Venue" htmlFor="location" required error={err("location")}>
              <Input
                id="location"
                name="location"
                defaultValue={event?.location}
                placeholder="Lab Elektronika, Pawon 2"
                invalid={Boolean(err("location"))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor="city" required error={err("city")}>
                <Input
                  id="city"
                  name="city"
                  defaultValue={event?.city ?? "Bandung"}
                  invalid={Boolean(err("city"))}
                />
              </Field>
              <Field label="Street address" htmlFor="address" error={err("address")}>
                <Input
                  id="address"
                  name="address"
                  defaultValue={event?.address ?? ""}
                  placeholder="Optional"
                  invalid={Boolean(err("address"))}
                />
              </Field>
            </div>
          </fieldset>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Publication</legend>

            <Field label="Status" htmlFor="status" required error={err("status")}>
              <Select
                id="status"
                name="status"
                defaultValue={event?.status ?? "DRAFT"}
                invalid={Boolean(err("status"))}
              >
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Category" htmlFor="category" required error={err("category")}>
              <Select
                id="category"
                name="category"
                defaultValue={event?.category ?? "TECHNICAL_CONFERENCE"}
                invalid={Boolean(err("category"))}
              >
                {EVENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_META[category].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Format" htmlFor="format" required error={err("format")}>
              <Select
                id="format"
                name="format"
                defaultValue={event?.format ?? "IN_PERSON"}
                invalid={Boolean(err("format"))}
              >
                {EVENT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {FORMAT_META[format].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Checkbox
              name="isFeatured"
              label="Feature on the catalog"
              description="Only published events can be featured."
              defaultChecked={event?.isFeatured ?? false}
            />
            {err("isFeatured") && (
              <p role="alert" className="text-body-sm text-critical">
                {err("isFeatured")}
              </p>
            )}
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Registration</legend>

            <Field
              label="Price (IDR)"
              htmlFor="price"
              required
              hint="0 means free to attend."
              error={err("price")}
            >
              <Input
                id="price"
                name="price"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                defaultValue={event?.price ?? 0}
                invalid={Boolean(err("price"))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacity" htmlFor="capacity" required error={err("capacity")}>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={event?.capacity ?? 100}
                  invalid={Boolean(err("capacity"))}
                />
              </Field>

              <Field
                label="Registered"
                htmlFor="attendees"
                required
                hint="Cannot exceed capacity."
                error={err("attendees")}
              >
                <Input
                  id="attendees"
                  name="attendees"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={event?.attendees ?? 0}
                  invalid={Boolean(err("attendees"))}
                />
              </Field>
            </div>

            <Field label="Organiser" htmlFor="organizer" required error={err("organizer")}>
              <Input
                id="organizer"
                name="organizer"
                defaultValue={event?.organizer ?? "IEEE ITB Student Branch"}
                invalid={Boolean(err("organizer"))}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-line bg-surface-container-lowest p-5">
            <legend className="px-1 text-label-md font-semibold text-ink">Cover image</legend>
            <CoverImageField event={event} error={err("imageUrl")} />
          </fieldset>

          <div className="flex flex-col gap-2">
            <SubmitButton label={submitLabel} />
            {event && (
              <p className="text-center text-body-sm text-meta">
                Permalink: <code className="font-mono">/events/{event.slug}</code>
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function CoverImageField({ event, error }: { event?: EditableEvent; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  // Object URLs are not garbage collected by the browser; without revoking the
  // previous one, every re-pick leaks the whole file in memory.
  const previewRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  /**
   * Check the file before it is submitted.
   *
   * The server re-validates everything regardless — this is purely to avoid a
   * pointless round-trip on a 20 MB file. The same size limit and the same
   * allow-list are used, so the message matches what the server would say.
   */
  function validate(file: File): string | null {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
      return `Upload a ${acceptedImageLabel()} file.`;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${
        MAX_UPLOAD_BYTES / 1024 / 1024
      } MB.`;
    }
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-line bg-surface-container">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: preview, not a server-optimised source
          <img src={preview} alt="Selected cover preview" className="size-full object-cover" />
        ) : (
          <EventCover
            slug={event?.slug ?? "new-event"}
            title={event?.title ?? "New event"}
            category={event?.category ?? "TECHNICAL_CONFERENCE"}
            imageUrl={event?.imageUrl ?? null}
            sizes="320px"
          />
        )}
      </div>

      <label
        htmlFor="image"
        className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-surface-container-lowest text-label-md font-semibold text-ink transition-colors hover:border-line-strong"
      >
        <UploadIcon className="size-4" />
        Choose image
      </label>
      <input
        ref={fileRef}
        id="image"
        name="image"
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        aria-invalid={error || localError ? true : undefined}
        aria-describedby={error || localError ? "image-error" : undefined}
        className="sr-only"
        onChange={(changeEvent) => {
          const file = changeEvent.target.files?.[0];

          if (previewRef.current) {
            URL.revokeObjectURL(previewRef.current);
            previewRef.current = null;
          }
          setPreview(null);

          if (!file) {
            setLocalError(null);
            return;
          }

          const problem = validate(file);
          if (problem) {
            // Clear the input so a rejected file is not silently submitted
            // anyway, and reset it so re-picking the same file fires change.
            setLocalError(problem);
            changeEvent.target.value = "";
            return;
          }

          setLocalError(null);
          const objectUrl = URL.createObjectURL(file);
          previewRef.current = objectUrl;
          setPreview(objectUrl);
        }}
      />

      {error || localError ? (
        <p id="image-error" role="alert" className="text-body-sm text-critical">
          {error ?? localError}
        </p>
      ) : (
        <p className="text-body-sm text-meta">
          {acceptedImageLabel()} up to {(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)} MB. Leave empty
          to keep the current cover.
        </p>
      )}
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" full disabled={pending}>
      {pending ? <Spinner label="Saving" /> : <CheckCircleIcon className="size-4" />}
      {pending ? "Saving…" : label}
    </Button>
  );
}
