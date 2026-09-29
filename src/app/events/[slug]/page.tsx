import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { EventCover } from "@/components/ui/cover";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { EventCardCompact } from "@/components/public/event-card";
import {
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  StarIcon,
  TicketIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import { getEventBySlug, getRelatedEvents } from "@/lib/services/event-service";
import { formatDateLong, formatEventRange, formatPrice, formatTime, hasEnded } from "@/lib/format";
import { APP_NAME, CATEGORY_META, FORMAT_META } from "@/lib/constants";
import { toParagraphs } from "@/lib/utils";

/**
 * Public event detail.
 *
 * `generateMetadata` shares the same lookup as the page body. Next dedupes the
 * identical `fetch`-less Prisma call within a single render pass via the React
 * cache, so this does not double the query cost.
 */
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug, "public");

  if (!event) {
    return { title: `Event not found — ${APP_NAME}` };
  }

  return {
    title: `${event.title} — ${APP_NAME}`,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      type: "article",
      ...(event.imageUrl ? { images: [{ url: event.imageUrl }] } : {}),
    },
  };
}

const CATEGORY_TONES: Record<string, BadgeTone> = {
  TECHNICAL_CONFERENCE: "info",
  WORKSHOP: "primary",
  HANDS_ON_LAB: "success",
  EXECUTIVE_SUMMIT: "warning",
  HACKATHON: "critical",
  WEBINAR: "info",
  COMMUNITY: "neutral",
};

export default async function EventDetailPage({ params }: Params) {
  const { slug } = await params;
  const event = await getEventBySlug(slug, "public");

  // A draft or archived event is indistinguishable from a missing one for the
  // public — both correctly 404 rather than leaking the event's existence.
  if (!event) notFound();

  const related = await getRelatedEvents(event, 3);

  const ended = hasEnded(event.endDate);
  const soldOut = event.status === "SOLD_OUT";
  // `CANCELLED` is not in PUBLIC_STATUSES, so a public read can never return
  // one and a cancellation notice here would be unreachable. An admin who
  // cancels an event should set it to ARCHIVED, which does hide it.
  const category = CATEGORY_META[event.category as keyof typeof CATEGORY_META];
  const format = FORMAT_META[event.format as keyof typeof FORMAT_META];
  const paragraphs = toParagraphs(event.description);
  const isOnline = event.city === "Online" || event.format === "VIRTUAL";

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-label-md font-semibold text-primary transition-colors hover:text-on-primary-container"
        >
          <ArrowLeftIcon className="size-4" />
          Back to catalog
        </Link>

        <article className="overflow-hidden rounded-lg border border-line bg-surface-container-lowest">
          <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
            <EventCover
              slug={event.slug}
              title={event.title}
              category={event.category}
              imageUrl={event.imageUrl}
              sizes="(max-width: 1152px) 100vw, 1152px"
              priority
            />
            {event.isFeatured && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-[#d67f00] bg-primary-container px-2.5 py-1 text-label-sm font-semibold text-ink">
                <StarIcon className="size-3.5" />
                Featured
              </span>
            )}
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                {category && (
                  <Badge tone={CATEGORY_TONES[event.category] ?? "neutral"} dot>
                    {category.label}
                  </Badge>
                )}
                {format && <Badge tone="neutral">{format.label}</Badge>}
                {soldOut && <Badge tone="critical">Sold out</Badge>}
                {ended && <Badge tone="neutral">Concluded</Badge>}
              </div>

              <h1 className="mt-3 font-display-lg leading-tight text-ink">{event.title}</h1>
              <p className="mt-2 text-body-lg text-meta">{event.summary}</p>

              <div className="mt-8 space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-body-md leading-relaxed text-on-surface-variant">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-8 rounded-lg border border-line bg-surface-container-low p-5">
                <h2 className="font-display-xs text-ink">Organised by</h2>
                <p className="mt-1 text-body-md text-meta">{event.organizer}</p>
                <p className="mt-3 text-body-sm text-meta">
                  Published {formatDateLong(event.createdAt)} · Last updated{" "}
                  {formatDateLong(event.updatedAt)}
                </p>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="overflow-hidden rounded-lg border border-line bg-surface-container-lowest">
                <div className="border-b border-line bg-surface-container-low px-5 py-4">
                  <p className="text-label-sm text-meta">Registration</p>
                  <p className="font-display-sm text-ink">{formatPrice(event.price)}</p>
                  {event.price === 0 && (
                    <p className="mt-0.5 text-body-sm text-success">Free for all attendees</p>
                  )}
                </div>

                <dl className="divide-y divide-surface-variant">
                  <DetailRow icon={<CalendarIcon className="size-4" />} term="Date">
                    <time dateTime={event.startDate.toISOString()}>
                      {formatEventRange(event.startDate, event.endDate)}
                    </time>
                    <span className="block text-body-sm text-meta">
                      {formatDateLong(event.startDate)}
                    </span>
                  </DetailRow>

                  <DetailRow icon={<ClockIcon className="size-4" />} term="Time (WIB)">
                    {formatTime(event.startDate)}
                    {event.endDate.getTime() !== event.startDate.getTime() &&
                      ` – ${formatTime(event.endDate)}`}
                  </DetailRow>

                  <DetailRow icon={<LocationIcon className="size-4" />} term="Location">
                    {event.location}
                    {event.address && (
                      <span className="block text-body-sm text-meta">{event.address}</span>
                    )}
                    {event.city && <span className="block text-body-sm text-meta">{event.city}</span>}
                  </DetailRow>

                  <DetailRow icon={<UsersIcon className="size-4" />} term="Capacity">
                    <span className="tabular">
                      {event.attendees.toLocaleString("en-US")} /{" "}
                      {event.capacity.toLocaleString("en-US")} registered
                    </span>
                    <CapacityBar attendees={event.attendees} capacity={event.capacity} />
                  </DetailRow>

                  <DetailRow icon={<WalletIcon className="size-4" />} term="Format">
                    {format?.label ?? event.format}
                    {isOnline && (
                      <span className="block text-body-sm text-meta">
                        Joining details are emailed to registrants.
                      </span>
                    )}
                  </DetailRow>
                </dl>

                <div className="border-t border-line p-5">
                  {ended ? (
                    <p className="text-center text-body-sm text-meta">
                      This event has already taken place.
                    </p>
                  ) : soldOut ? (
                    <>
                      <p className="mb-3 text-center text-body-sm text-critical">
                        This event is fully booked.
                      </p>
                      <Link
                        href={`/?category=${event.category}&when=upcoming`}
                        className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-surface-container-lowest text-label-md font-semibold text-ink transition-colors hover:border-line-strong"
                      >
                        See similar events
                      </Link>
                    </>
                  ) : (
                    <a
                      href={`mailto:events@ieee-itb.ac.id?subject=${encodeURIComponent(
                        `Registration — ${event.title}`,
                      )}`}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#d67f00] bg-primary-container text-label-md font-semibold text-ink transition-colors hover:bg-[#e88b00]"
                    >
                      <TicketIcon className="size-4" />
                      Register to attend
                    </a>
                  )}
                  <p className="mt-2 text-center text-body-sm text-meta">
                    Registration is handled by the branch office.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-12">
            <h2 id="related-heading" className="mb-4 font-display-sm text-ink">
              You might also like
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <EventCardCompact key={item.id} event={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

function DetailRow({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-label-sm text-meta">{term}</dt>
        <dd className="mt-0.5 text-body-md text-ink">{children}</dd>
      </div>
    </div>
  );
}

function CapacityBar({ attendees, capacity }: { attendees: number; capacity: number }) {
  if (capacity <= 0) return null;
  const percent = Math.min(100, Math.round((attendees / capacity) * 100));
  const nearlyFull = percent >= 85;

  return (
    <>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% of places taken`}
      >
        <div
          className={`h-full rounded-full ${nearlyFull ? "bg-critical" : "bg-primary-container"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {nearlyFull && attendees < capacity && (
        <p className="mt-1 text-body-sm text-critical">Almost full — limited places remain.</p>
      )}
    </>
  );
}
