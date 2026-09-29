import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { CatalogSearch } from "@/components/public/catalog-search";
import { CatalogFilters } from "@/components/public/catalog-filters";
import { EventCard } from "@/components/public/event-card";
import { EventCover } from "@/components/ui/cover";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { ArrowRightIcon, CalendarIcon, LocationIcon, SearchIcon, StarIcon } from "@/components/icons";
import { getCatalogFacets, getHeroEvent, listEvents } from "@/lib/services/event-service";
import { DEFAULT_QUERY, eventQuerySchema } from "@/lib/validation/event";
import { formatEventRange, formatPrice } from "@/lib/format";
import { href } from "@/lib/routes";
import { APP_NAME, APP_TAGLINE, CATEGORY_META } from "@/lib/constants";

/**
 * Public event catalogue.
 *
 * Rendered dynamically because all filter state lives in the query string, so
 * results are bookmarkable and shareable. The query string is validated with
 * Zod and coerced, meaning a hand-typed `?page=abc` or an unknown
 * `?category=NOPE` degrades to the default view instead of throwing.
 */
export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Browse lectures, workshops, hands-on labs and community sessions organised by the IEEE ITB Student Branch in Bandung.",
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const flat = normalizeParams(raw);
  const parsed = eventQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : DEFAULT_QUERY;

  // `category`/`format`/`featured` are absent from the URL unless set, whereas
  // `when` and `price` carry an explicit "all" sentinel.
  const hasFilters =
    Boolean(query.q) ||
    query.category !== undefined ||
    query.format !== undefined ||
    (query.when !== undefined && query.when !== "all") ||
    (query.price !== undefined && query.price !== "all") ||
    query.featured === "true";

  // The hero only makes sense on the unfiltered landing view.
  const [list, facets, hero] = await Promise.all([
    listEvents(query, "public"),
    getCatalogFacets(query, "public"),
    hasFilters ? Promise.resolve(null) : getHeroEvent(),
  ]);

  return (
    <>
      <SiteHeader
        searchSlot={(placement) => (
          <Suspense fallback={<div className="h-10 w-full max-w-md rounded-md bg-surface-container" />}>
            <CatalogSearch id={`catalog-search-${placement}`} />
          </Suspense>
        )}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {hero && <HeroEvent event={hero} />}

        <header className="mb-6">
          <h1 className="font-display-sm text-ink">Event Catalog</h1>
          <p className="mt-1 text-body-md text-meta">
            {list.total > 0
              ? `${list.total.toLocaleString("en-US")} ${list.total === 1 ? "event" : "events"} found`
              : "Browse what is happening around campus"}
          </p>
        </header>

        <div className="mb-6">
          <Suspense fallback={<div className="h-24" />}>
            <CatalogFilters facets={facets} />
          </Suspense>
        </div>

        {list.events.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className="size-6" />}
            title={hasFilters ? "No events match these filters" : "No events published yet"}
            description={
              hasFilters
                ? "Try a different search term, or clear the filters to see everything that is happening."
                : "Check back soon — new events appear here as soon as they are confirmed."
            }
            action={
              hasFilters ? (
                <Link
                  href="/"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-[#d67f00] bg-primary-container px-4 text-label-md font-semibold text-ink transition-colors hover:bg-[#e88b00]"
                >
                  Clear all filters
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.events.map((event, index) => (
                <EventCard key={event.id} event={event} priority={index < 3} />
              ))}
            </div>

            <Pagination
              className="mt-10"
              page={list.page}
              pageCount={list.totalPages}
              totalItems={list.total}
              buildHref={(page) => buildCatalogHref(raw, page, query.perPage)}
            />
          </>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

/** Featured-event banner shown only on the unfiltered catalogue. */
function HeroEvent({ event }: { event: Awaited<ReturnType<typeof getHeroEvent>> & object }) {
  const category = CATEGORY_META[event.category as keyof typeof CATEGORY_META];

  return (
    <article className="relative mb-10 overflow-hidden rounded-lg border border-line">
      <div className="grid lg:grid-cols-2">
        <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[19rem]">
          <EventCover
            slug={event.slug}
            title={event.title}
            category={event.category}
            imageUrl={event.imageUrl}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        <div className="flex flex-col justify-center gap-3 bg-surface-container-lowest p-6 sm:p-8">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#d67f00] bg-primary-container px-2.5 py-1 text-label-sm font-semibold text-ink">
            <StarIcon className="size-3.5" />
            Featured event
          </span>

          <h2 className="font-display-sm leading-tight text-ink">{event.title}</h2>
          <p className="text-body-md text-meta">{event.summary}</p>

          <dl className="mt-1 space-y-1.5 text-body-md text-meta">
            <div className="flex items-start gap-2">
              <dt className="sr-only">Date</dt>
              <CalendarIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <dd>{formatEventRange(event.startDate, event.endDate)}</dd>
            </div>
            <div className="flex items-start gap-2">
              <dt className="sr-only">Location</dt>
              <LocationIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <dd>
                {event.location}
                {event.city && event.city !== "Online" && ` · ${event.city}`}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-label-md font-semibold text-ink">
              {formatPrice(event.price)}
              {category && <span className="ml-2 font-normal text-meta">· {category.label}</span>}
            </p>
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-[#d67f00] bg-primary-container px-4 text-label-md font-semibold text-ink transition-colors hover:bg-[#e88b00]"
            >
              View details
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Next delivers `searchParams` values as `string | string[]`; take the first. */
function normalizeParams(raw: SearchParams): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

/** Rebuilds the catalogue URL, replacing only the page number. */
function buildCatalogHref(raw: SearchParams, page: number, perPage: number): Route {
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params[key] = single;
  }
  params.perPage = String(perPage);
  if (page > 1) params.page = String(page);
  return href("/", params);
}
