/**
 * Locale-aware formatters.
 *
 * Prices are stored as whole Indonesian Rupiah. Events are organised by the
 * IEEE ITB Student Branch, so IDR + Asia/Jakarta is used throughout.
 */

const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const PLAIN = new Intl.NumberFormat("id-ID");

const DATE_LONG = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DATE_MEDIUM = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DATE_DAY = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Jakarta",
});

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

const DATE_INPUT = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

const TIME_INPUT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

/** `Rp 250.000` — pass 0 for a free event. */
export function formatPrice(price: number): string {
  if (price <= 0) return "Free";
  return RUPIAH.format(price).replace(/\s/g, " ");
}

/** Compact form for table cells: `Rp 1,2 jt`. */
export function formatPriceCompact(price: number): string {
  if (price <= 0) return "Free";
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `Rp ${millions.toFixed(millions % 1 === 0 ? 0 : 1)} jt`;
  }
  if (price >= 1_000) return `Rp ${Math.round(price / 1_000)} rb`;
  return RUPIAH.format(price).replace(/\s/g, " ");
}

export function formatNumber(value: number): string {
  return PLAIN.format(value);
}

/** `12 Oktober 2026` style long date. */
export function formatDateLong(value: Date | string): string {
  return DATE_LONG.format(new Date(value));
}

export function formatDateMedium(value: Date | string): string {
  return DATE_MEDIUM.format(new Date(value));
}

export function formatDateDay(value: Date | string): string {
  return DATE_DAY.format(new Date(value));
}

export function formatTime(value: Date | string): string {
  return TIME.format(new Date(value));
}

/** `09:00` for `<input type="datetime-local">`. */
export function toDateTimeInputValue(value: Date | string): string {
  const d = new Date(value);
  return `${DATE_INPUT.format(d)}T${TIME_INPUT.format(d)}`;
}

/** `2026-10-12` for `<input type="date">`. */
export function toDateInputValue(value: Date | string): string {
  return DATE_INPUT.format(new Date(value));
}

/**
 * Human-friendly event range:
 *  - same day   → `12 Oct 2026 · 09:00 – 17:00`
 *  - same month → `12 – 14 Oct 2026`
 *  - otherwise  → `28 Dec 2026 – 2 Jan 2027`
 */
export function formatEventRange(start: Date | string, end: Date | string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = toDateInputValue(s) === toDateInputValue(e);
  if (sameDay) {
    return `${formatDateMedium(s)} · ${formatTime(s)} – ${formatTime(e)}`;
  }
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} – ${formatDateMedium(e)}`;
  }
  return `${formatDateMedium(s)} – ${formatDateMedium(e)}`;
}

/** "in 3 days" / "2 days ago" / "today" */
export function formatRelativeDay(value: Date | string): string {
  const target = new Date(value);
  const today = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(target) - startOf(today)) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0) {
    if (days < 30) return `in ${days} days`;
    const months = Math.round(days / 30);
    return months <= 1 ? "in a month" : `in ${months} months`;
  }
  const ago = Math.abs(days);
  if (ago < 30) return `${ago} days ago`;
  const months = Math.round(ago / 30);
  return months <= 1 ? "a month ago" : `${months} months ago`;
}

/** True when the event has already finished (used for "Upcoming / Past"). */
export function hasEnded(end: Date | string, now: Date = new Date()): boolean {
  return new Date(end).getTime() < now.getTime();
}
