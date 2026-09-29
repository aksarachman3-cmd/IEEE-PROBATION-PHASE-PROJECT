import { z } from "zod";
import {
  EVENT_CATEGORIES,
  EVENT_FORMATS,
  EVENT_STATUSES,
  PRICE_FILTER_VALUES,
  SORT_VALUES,
  TIME_FILTER_VALUES,
} from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  Field helpers                                                             */
/* -------------------------------------------------------------------------- */

const trimmed = (max: number, message: string) =>
  z.string().trim().max(max, { error: message });

const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, { error: `${label} must be at least ${min} characters.` })
    .max(max, { error: `${label} must be ${max} characters or fewer.` });

/**
 * `<input type="datetime-local">` posts a wall-clock string such as
 * `2026-10-12T09:00` with no timezone. Parsing that with `new Date()` would
 * silently use the *server's* timezone, so an event created on a laptop in
 * Bandung could shift by a day when the app is deployed elsewhere.
 *
 * The app presents all times in WIB (UTC+7, no DST), so the offset is applied
 * explicitly and the result is identical on every machine.
 */
const JAKARTA_OFFSET_MINUTES = 7 * 60;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function naiveToDate(value: string): Date | null {
  const match = DATETIME_RE.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute) - JAKARTA_OFFSET_MINUTES,
      second ? Number(second) : 0,
    ),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Inverse of {@link naiveToDate} — renders a `Date` back into an input value. */
export function dateToNaive(date: Date): string {
  const shifted = new Date(date.getTime() + JAKARTA_OFFSET_MINUTES * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`
  );
}

/** A required date-time input, surfaced as a friendly field error. */
/**
 * A date-time input, accepted either as a naive local string or a `Date`.
 *
 * Both shapes have to work: the admin form submits a `datetime-local` string,
 * while other callers may already hold a `Date`. Strings are always read as
 * *naive* wall-clock time in `naiveToDate`, which is what keeps a naive string
 * and an equivalent `Date` agreeing regardless of the server's own timezone.
 * Parsing here — rather than with `new Date(string)` in the route — is what
 * keeps that interpretation in exactly one place.
 */
const datetimeField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, { error: `${label} is required.` })
    .refine((value) => naiveToDate(value) !== null, {
      error: `${label} must be a valid date and time.`,
    })
    .transform((value) => naiveToDate(value) as Date)
    .or(z.date());

/** An optional date-time input; blank collapses to `null`. */
const optionalDatetimeField = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === "" || naiveToDate(value) !== null, {
      error: `${label} must be a valid date and time.`,
    })
    .transform((value) => (value === "" ? null : naiveToDate(value)))
    .or(z.date().nullable());

/** Numbers arrive as strings from FormData; blank is treated as "not provided". */
function integerField(options: { min: number; max: number; label: string }) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number({ error: `${options.label} must be a number.` })
      .int(`${options.label} must be a whole number.`)
      .min(options.min, { error: `${options.label} must be at least ${options.min}.` })
      .max(options.max, { error: `${options.label} must be at most ${options.max}.` }),
  );
}

/** HTML checkboxes submit `"on"` when checked and nothing when not. */
const checkboxField = z
  .union([z.literal("on"), z.literal("true"), z.literal(true), z.boolean()])
  .optional()
  .transform((value) => value === true || value === "on" || value === "true");

/* -------------------------------------------------------------------------- */
/*  Event                                                                    */
/* -------------------------------------------------------------------------- */

/** Trimmed copy for a catalog card. */
export const summaryField = requiredText("Summary", 10, 220);

/** The shape returned by {@link eventFormSchema}, ready for the database. */
export type EventFormValues = {
  title: string;
  summary: string;
  description: string;
  category: (typeof EVENT_CATEGORIES)[number];
  format: (typeof EVENT_FORMATS)[number];
  status: (typeof EVENT_STATUSES)[number];
  startDate: Date;
  endDate: Date | null;
  location: string;
  address: string | null;
  city: string;
  organizer: string;
  price: number;
  capacity: number;
  attendees: number;
  imageUrl: string | null;
  isFeatured: boolean;
};

export const eventFormSchema = z
  .object({
    title: requiredText("Title", 5, 120),
    summary: summaryField,
    description: requiredText("Description", 30, 5000),
    category: z.enum(EVENT_CATEGORIES, { error: "Choose a category." }),
    format: z.enum(EVENT_FORMATS, { error: "Choose an event format." }),
    status: z.enum(EVENT_STATUSES, { error: "Choose a status." }),
    startDate: datetimeField("Start date"),
    endDate: optionalDatetimeField("End date"),
    location: requiredText("Location", 3, 120),
    // Nullable, because a `PATCH` merges these straight out of the database
    // where an unset column is already `null`. Without `.nullish()` every
    // update to an event that has no address or no cover would be rejected.
    address: trimmed(200, "Address must be 200 characters or fewer.")
      .nullish()
      .transform((value) => value || null),
    city: requiredText("City", 2, 80),
    organizer: requiredText("Organiser", 3, 120),
    price: integerField({ min: 0, max: 100_000_000, label: "Price" }),
    capacity: integerField({ min: 1, max: 100_000, label: "Capacity" }),
    attendees: integerField({ min: 0, max: 100_000, label: "Registered attendees" }),
    imageUrl: trimmed(500, "Image URL must be 500 characters or fewer.")
      .nullish()
      .transform((value) => value || null),
    isFeatured: checkboxField,
  })
  .superRefine((values, ctx) => {
    // A blank end date means "single-day event" — reuse the start date.
    //
    // Every value here is treated as untrusted. Zod still runs `superRefine`
    // after a *field* check has failed, in which case the transform that was
    // supposed to produce a `Date` never ran and the raw string is still in
    // place. Reading `.getTime()` off that string would throw a TypeError and
    // turn a bad request into a 500, so guard on the type instead.
    const start = values.startDate;
    const isDate = (value: unknown): value is Date => value instanceof Date;

    const end = isDate(values.endDate) ? values.endDate : start;
    if (isDate(end) && isDate(start)) {
      values.endDate = end;

      if (end.getTime() < start.getTime()) {
        ctx.addIssue({
          code: "custom",
          path: ["endDate"],
          message: "End date must be on or after the start date.",
        });
      }
    }

    if (typeof values.attendees === "number" && typeof values.capacity === "number") {
      if (values.attendees > values.capacity) {
        ctx.addIssue({
          code: "custom",
          path: ["attendees"],
          message: "Registered attendees cannot exceed capacity.",
        });
      }
    }

    if (values.isFeatured && values.status !== "PUBLISHED") {
      ctx.addIssue({
        code: "custom",
        path: ["isFeatured"],
        message: "Only published events can be featured on the catalog.",
      });
    }
  });

/** Field name → first error message, for rendering under each input. */
export type FieldErrors = Partial<Record<keyof EventFormValues, string>>;

/**
 * An existing event as the form needs it.
 *
 * `EventRecord` stores `category`/`format`/`status` as plain `string` (SQLite
 * has no enums), so the row type cannot be fed to the form directly. This
 * re-declares the fields the form reads with their validated literal unions,
 * which makes the edit page fail to compile if a stored value ever drifts
 * outside the allowed set.
 */
export type EditableEvent = EventFormValues & {
  id: string;
  slug: string;
};

/** Narrow a database row to the shape the form expects, or `null` if invalid. */
export function toEditableEvent(record: {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  format: string;
  status: string;
  startDate: Date;
  endDate: Date;
  location: string;
  address: string | null;
  city: string;
  organizer: string;
  price: number;
  capacity: number;
  attendees: number;
  imageUrl: string | null;
  isFeatured: boolean;
}): EditableEvent | null {
  const result = eventFormSchema.safeParse({
    title: record.title,
    summary: record.summary,
    description: record.description,
    category: record.category,
    format: record.format,
    status: record.status,
    startDate: record.startDate,
    endDate: record.endDate,
    location: record.location,
    address: record.address ?? undefined,
    city: record.city,
    organizer: record.organizer,
    price: record.price,
    capacity: record.capacity,
    attendees: record.attendees,
    imageUrl: record.imageUrl ?? undefined,
    isFeatured: record.isFeatured,
  });

  if (!result.success) return null;
  return { ...result.data, id: record.id, slug: record.slug };
}

/* -------------------------------------------------------------------------- */
/*  Catalog query string                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A query parameter that may be absent, blank, or one of a fixed set.
 *
 * `.optional()` must come *before* the transform. Putting it after (i.e. on the
 * piped enum) types the output as optional but still requires the key to be
 * present, so a plain `?q=foo` would fail on every absent filter. The blank →
 * `undefined` mapping then lives in the transform, where the input side has
 * already been widened.
 */
const optionalParam = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v))
    .pipe(z.enum(values).optional());

/** Query parameters accepted by the public catalog and the admin event list. */
export const eventQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: optionalParam(EVENT_CATEGORIES),
  format: optionalParam(EVENT_FORMATS),
  status: optionalParam(EVENT_STATUSES),
  when: optionalParam(TIME_FILTER_VALUES),
  price: optionalParam(PRICE_FILTER_VALUES),
  sort: optionalParam(SORT_VALUES),
  featured: optionalParam(["true", "false"] as const),
  page: z.coerce.number().int().min(1).catch(1),
  perPage: z.coerce.number().int().min(1).max(50).catch(9),
});

export type EventQuery = z.infer<typeof eventQuerySchema>;

/** Defaults applied when the URL carries no (or invalid) parameters. */
export const DEFAULT_QUERY: EventQuery = {
  sort: "featured",
  when: "all",
  price: "all",
  page: 1,
  perPage: 9,
};
