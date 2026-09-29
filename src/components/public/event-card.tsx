import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { EventCover } from "@/components/ui/cover";
import { ArrowRightIcon, CalendarIcon, LocationIcon, StarIcon } from "@/components/icons";
import { CATEGORY_META, STATUS_META } from "@/lib/constants";
import { formatEventRange, formatPrice, hasEnded } from "@/lib/format";
import type { EventRecord } from "@/lib/services/event-service";
import { cn } from "@/lib/utils";

const CATEGORY_TONES: Record<string, BadgeTone> = {
  TECHNICAL_CONFERENCE: "info",
  WORKSHOP: "primary",
  HANDS_ON_LAB: "success",
  EXECUTIVE_SUMMIT: "warning",
  HACKATHON: "critical",
  WEBINAR: "info",
  COMMUNITY: "neutral",
};

/**
 * Catalog event card.
 *
 * The whole card is a link via a stretched pseudo-element on the title, so the
 * click target is large while the DOM order (and therefore the screen-reader
 * and tab order) stays correct: category, then date, then title, then location.
 */
export function EventCard({
  event,
  priority,
  showStatus,
  className,
}: {
  event: EventRecord;
  priority?: boolean;
  showStatus?: boolean;
  className?: string;
}) {
  const ended = hasEnded(event.endDate);
  const soldOut = event.status === "SOLD_OUT";
  const category = CATEGORY_META[event.category as keyof typeof CATEGORY_META];

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface-container-lowest",
        "transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
        // A cancelled or archived event should not look bookable.
        event.status === "CANCELLED" && "opacity-80",
        className,
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container">
        <EventCover
          slug={event.slug}
          title={event.title}
          category={event.category}
          imageUrl={event.imageUrl}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          priority={priority}
          className="transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {event.isFeatured && !ended && (
            <Badge tone="primary" className="bg-primary-container/95">
              <StarIcon className="size-3" />
              Featured
            </Badge>
          )}
          {soldOut && <Badge tone="critical">Sold out</Badge>}
          {event.status === "CANCELLED" && <Badge tone="critical">Cancelled</Badge>}
          {event.status === "DRAFT" && showStatus && <Badge tone="warning">Draft</Badge>}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={CATEGORY_TONES[event.category] ?? "neutral"} dot>
            {category?.label ?? event.category}
          </Badge>
          {showStatus && event.status !== "PUBLISHED" && (
            <Badge tone={STATUS_META[event.status as keyof typeof STATUS_META]?.tone ?? "neutral"}>
              {STATUS_META[event.status as keyof typeof STATUS_META]?.label ?? event.status}
            </Badge>
          )}
        </div>

        <h3 className="font-display-xs leading-snug text-ink">
          {/* Stretched link: expands the hit area to the whole card. */}
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>

        <dl className="mt-auto space-y-1.5 text-body-md text-meta">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Date</dt>
            <CalendarIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <dd>
              <time dateTime={event.startDate.toISOString()}>{formatEventRange(event.startDate, event.endDate)}</time>
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Location</dt>
            <LocationIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <dd className="line-clamp-1">
              {event.location}
              {event.city && event.city !== "Online" && (
                <span className="text-meta"> &middot; {event.city}</span>
              )}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-3 border-t border-surface-variant pt-3">
          <p className="text-label-md font-semibold text-ink">
            {ended ? <span className="text-meta">Concluded</span> : formatPrice(event.price)}
          </p>
          <span className="flex items-center gap-1 text-label-md font-semibold text-primary">
            Details
            <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

/** Compact variant for the "related events" rail on the detail page. */
export function EventCardCompact({ event }: { event: EventRecord }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-line bg-surface-container-lowest p-3",
        "transition-colors hover:border-line-strong hover:bg-[#f7fafa]",
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-container">
        <EventCover
          slug={event.slug}
          title={event.title}
          category={event.category}
          imageUrl={event.imageUrl}
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-label-md font-semibold text-ink">{event.title}</p>
        <p className="mt-1 flex items-center gap-1.5 text-body-sm text-meta">
          <CalendarIcon className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{formatEventRange(event.startDate, event.endDate)}</span>
        </p>
      </div>
    </Link>
  );
}
