/**
 * Single source of truth for every categorical value in the application.
 *
 * The database stores these as plain strings (SQLite has no enum type), so this
 * file is what keeps the data honest: TypeScript unions are derived from the
 * arrays, the Zod schemas validate against them, and the UI renders the labels.
 */

export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "SOLD_OUT",
  "CANCELLED",
  "ARCHIVED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_CATEGORIES = [
  "TECHNICAL_CONFERENCE",
  "WORKSHOP",
  "HANDS_ON_LAB",
  "EXECUTIVE_SUMMIT",
  "HACKATHON",
  "WEBINAR",
  "COMMUNITY",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_FORMATS = ["IN_PERSON", "VIRTUAL", "HYBRID"] as const;
export type EventFormat = (typeof EVENT_FORMATS)[number];

/* -------------------------------------------------------------------------- */
/*  Presentation metadata                                                     */
/* -------------------------------------------------------------------------- */

type Tone = "neutral" | "success" | "warning" | "critical" | "info" | "brand";

export const STATUS_META: Record<
  EventStatus,
  { label: string; short: string; tone: Tone; dot: string }
> = {
  DRAFT: { label: "Draft", short: "Draft", tone: "neutral", dot: "bg-tertiary" },
  PUBLISHED: {
    label: "Published",
    short: "Published",
    tone: "success",
    dot: "bg-primary-container",
  },
  SOLD_OUT: {
    label: "Sold Out",
    short: "Sold out",
    tone: "critical",
    dot: "bg-critical",
  },
  CANCELLED: {
    label: "Cancelled",
    short: "Cancelled",
    tone: "critical",
    dot: "bg-error",
  },
  ARCHIVED: {
    label: "Archived",
    short: "Archived",
    tone: "warning",
    dot: "bg-warning",
  },
};

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; short: string; chip: string }
> = {
  TECHNICAL_CONFERENCE: {
    label: "Technical Conference",
    short: "Conference",
    chip: "bg-secondary-container text-on-secondary-container",
  },
  WORKSHOP: {
    label: "Developer Workshop",
    short: "Workshop",
    chip: "bg-tertiary-fixed text-on-tertiary-fixed",
  },
  HANDS_ON_LAB: {
    label: "Hands-on Lab",
    short: "Hands-on",
    chip: "bg-surface-container-high text-on-surface-variant",
  },
  EXECUTIVE_SUMMIT: {
    label: "Executive Summit",
    short: "Summit",
    chip: "bg-primary-container text-on-primary-container",
  },
  HACKATHON: {
    label: "Hackathon & Sprint",
    short: "Hackathon",
    chip: "bg-primary-fixed text-on-primary-fixed",
  },
  WEBINAR: {
    label: "Webinar & RSVP",
    short: "Webinar",
    chip: "bg-secondary-fixed text-on-secondary-fixed",
  },
  COMMUNITY: {
    label: "Community Meetup",
    short: "Meetup",
    chip: "bg-surface-container text-secondary",
  },
};

export const FORMAT_META: Record<EventFormat, { label: string; short: string }> = {
  IN_PERSON: { label: "In-Person", short: "On-site" },
  VIRTUAL: { label: "Virtual", short: "Online" },
  HYBRID: { label: "Hybrid", short: "Hybrid" },
};

/* -------------------------------------------------------------------------- */
/*  Public catalog filtering / sorting options                                */
/* -------------------------------------------------------------------------- */

/* The `*_VALUES` tuples are the contract between the URL query string and the
   database filter builder. They are declared as literal tuples (not derived
   from the label arrays) so Zod can build a `z.enum` from them directly. */

export const TIME_FILTER_VALUES = [
  "all",
  "upcoming",
  "past",
  "today",
  "week",
  "month",
] as const;
export type TimeFilter = (typeof TIME_FILTER_VALUES)[number];

/** Labels for the "when" chips on the catalog page. */
export const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  all: "Any time",
  upcoming: "Upcoming",
  past: "Past",
  today: "Today",
  week: "This week",
  month: "This month",
};

export const SORT_VALUES = [
  "featured",
  "date_asc",
  "date_desc",
  "price_asc",
  "price_desc",
  "title_asc",
] as const;
export type SortOption = (typeof SORT_VALUES)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured first",
  date_asc: "Upcoming first",
  date_desc: "Past first",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  title_asc: "Title: A to Z",
};

export const PRICE_FILTER_VALUES = [
  "all",
  "free",
  "under_100k",
  "100k_500k",
  "over_500k",
] as const;
export type PriceFilter = (typeof PRICE_FILTER_VALUES)[number];

export const PRICE_FILTER_LABELS: Record<PriceFilter, string> = {
  all: "Any ticket price",
  free: "Free admission only",
  under_100k: "Under Rp 100.000",
  "100k_500k": "Rp 100.000 – Rp 500.000",
  over_500k: "Above Rp 500.000",
};

export const PAGE_SIZE_OPTIONS = [6, 9, 12] as const;

/* -------------------------------------------------------------------------- */
/*  Runtime configuration                                                     */
/* -------------------------------------------------------------------------- */

/** How long an authenticated admin session stays valid. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export const SESSION_COOKIE_NAME = "itb_session";

/** Max upload size for event cover images (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * The accepted MIME types live in `@/lib/image-types` so the browser form and
 * the server validator can share one list; re-exported here so callers that
 * already import the constants barrel do not need a second import.
 */
export {
  ACCEPTED_IMAGE_TYPES,
  IMAGE_ACCEPT_ATTRIBUTE,
  imageExtensionFor,
  acceptedImageLabel,
  type AcceptedImageType,
} from "@/lib/image-types";

export const APP_NAME = "IEEE ITB Events";
export const ORG_NAME = "IEEE ITB Student Branch";
export const APP_TAGLINE = "Campus events, engineering community";

/** Two-letter monogram used by the generated cover art. */
export function categoryInitials(category: string): string {
  const letters = category
    .split("_")
    .filter(Boolean)
    .map((word) => word[0]);
  return (letters.join("") || "EV").slice(0, 2).toUpperCase();
}
