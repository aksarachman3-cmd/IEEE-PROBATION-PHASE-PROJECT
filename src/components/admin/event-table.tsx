"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState, Spinner } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { EventCover } from "@/components/ui/cover";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import {
  CalendarIcon,
  CheckCircleIcon,
  EditIcon,
  ExternalLinkIcon,
  InboxIcon,
  PlusIcon,
  SearchIcon,
  StarIcon,
  UsersIcon,
} from "@/components/icons";
import { formatDateMedium, formatPrice } from "@/lib/format";
import { href } from "@/lib/routes";
import { SORT_LABELS, STATUS_META, TIME_FILTER_LABELS, type EventStatus } from "@/lib/constants";
import type { AdminStats, EventListResult } from "@/lib/services/event-service";
import type { EventQuery } from "@/lib/validation/event";
import { cn } from "@/lib/utils";

/**
 * Admin events table.
 *
 * Adapts to the viewport rather than scrolling sideways: a real `<table>` from
 * `md` up, and stacked cards below it. Both render the same data, and the
 * table is marked up properly (caption, `scope` on header cells) so column
 * meaning is not conveyed by position alone.
 *
 * Every filter is a URL link, so the table stays shareable and the browser's
 * back button steps through filter history.
 */
export function AdminEventTable({
  result,
  stats,
  query,
  rawParams,
  notice,
}: {
  result: EventListResult;
  stats: AdminStats;
  query: EventQuery;
  rawParams: Record<string, string | undefined>;
  /** Which post-mutation flash to show, or `null` for none. */
  notice: "created" | "deleted" | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(patch: Record<string, string | undefined>) {
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of searchParams.entries()) {
      // `page` resets on any filter change; the flash flags are dropped so the
      // notice disappears as soon as the admin starts browsing.
      if (key !== "page" && key !== "created" && key !== "deleted") params[key] = value;
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "" || value === "all") delete params[key];
      else params[key] = value;
    }
    startTransition(() => router.replace(href(pathname, params), { scroll: false }));
  }

  const tabs: { value: string | undefined; label: string; count: number }[] = [
    { value: undefined, label: "All", count: stats.total },
    { value: "PUBLISHED", label: "Published", count: stats.published },
    { value: "DRAFT", label: "Draft", count: stats.draft },
    { value: "SOLD_OUT", label: "Sold out", count: stats.soldOut },
    { value: "CANCELLED", label: "Cancelled", count: stats.cancelled },
    { value: "ARCHIVED", label: "Archived", count: stats.archived },
  ];

  return (
    <>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display-sm text-ink">All events</h1>
          <p className="mt-1 text-body-md text-meta">
            {result.total.toLocaleString("en-US")} {result.total === 1 ? "event" : "events"} matching
            the current filters
          </p>
        </div>
        <Link href="/admin/events/new" className={buttonStyles({ variant: "primary" })}>
          <PlusIcon className="size-4" />
          Create event
        </Link>
      </header>

      {notice && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-md border border-success bg-success-container px-4 py-3 text-on-success-container"
        >
          <CheckCircleIcon className="mt-0.5 size-4 shrink-0" />
          <p className="text-body-md">
            {notice === "created"
              ? "Event created. It is now listed below — edit it to add a cover image or publish it."
              : "Event deleted. The change is reflected on the public catalog."}
          </p>
        </div>
      )}

      {/* Status tabs */}
      <div className="mb-4 scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
        {tabs.map((tab) => {
          const active = (query.status ?? undefined) === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => update({ status: tab.value })}
              aria-pressed={active}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-label-md font-label-md transition-colors",
                active
                  ? "border-[#d67f00] bg-primary-container text-ink"
                  : "border-line bg-surface-container-lowest text-ink hover:border-line-strong",
              )}
            >
              {tab.label}
              <span className="tabular text-body-sm text-meta">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mb-5 grid gap-3 rounded-lg border border-line bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-4">
        <form
          role="search"
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            update({ q: String(data.get("q") ?? "") || undefined });
          }}
        >
          <label htmlFor="admin-search" className="sr-only">
            Search events
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta" />
          <Input
            id="admin-search"
            name="q"
            type="search"
            defaultValue={query.q ?? ""}
            placeholder="Search title or location…"
            className="pl-9"
          />
        </form>

        <div>
          <label htmlFor="admin-when" className="sr-only">
            Time range
          </label>
          <Select
            id="admin-when"
            value={query.when ?? "all"}
            onChange={(event) => update({ when: event.target.value })}
          >
            {Object.entries(TIME_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="admin-sort" className="sr-only">
            Sort order
          </label>
          <Select
            id="admin-sort"
            value={query.sort ?? "featured"}
            onChange={(event) => update({ sort: event.target.value })}
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="admin-per-page" className="sr-only">
            Rows per page
          </label>
          <Select
            id="admin-per-page"
            value={String(query.perPage ?? 9)}
            onChange={(event) => update({ perPage: event.target.value })}
          >
            {[6, 9, 12, 24].map((value) => (
              <option key={value} value={value}>
                {value} per page
              </option>
            ))}
          </Select>
        </div>
      </div>

      {pending && (
        <p role="status" className="mb-3 flex items-center gap-2 text-body-sm text-meta">
          <Spinner label="Loading" />
          Updating…
        </p>
      )}

      {result.events.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="size-6" />}
          title="No events match these filters"
          description="Try clearing the search term or switching to a different status."
          action={
            <Link href="/admin/events/new" className={buttonStyles({ variant: "primary" })}>
              <PlusIcon className="size-4" />
              Create the first event
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface-container-lowest md:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                All events, {result.total} results, page {result.page} of {result.totalPages}
              </caption>
              <thead>
                <tr className="border-b border-line bg-surface-container-low">
                  {["Event", "Date", "Registered", "Price", "Status", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-4 py-3 text-label-sm font-label-md text-meta"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {result.events.map((event) => {
                  const status = STATUS_META[event.status as EventStatus];
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-[#f7fafa]">
                      <th scope="row" className="px-4 py-3 font-normal">
                        <div className="flex items-center gap-3">
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-container">
                            <EventCover
                              slug={event.slug}
                              title={event.title}
                              category={event.category}
                              imageUrl={event.imageUrl}
                              sizes="44px"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-label-md font-semibold text-ink">
                              {event.isFeatured && (
                                <StarIcon className="size-3 shrink-0 text-primary" aria-label="Featured" />
                              )}
                              <span className="line-clamp-1">{event.title}</span>
                            </p>
                            <p className="line-clamp-1 text-body-sm text-meta">{event.location}</p>
                          </div>
                        </div>
                      </th>
                      <td className="tabular px-4 py-3 text-body-md whitespace-nowrap text-meta">
                        {formatDateMedium(event.startDate)}
                      </td>
                      <td className="tabular px-4 py-3 text-body-md whitespace-nowrap text-meta">
                        {event.attendees} / {event.capacity}
                      </td>
                      <td className="tabular px-4 py-3 text-body-md whitespace-nowrap text-meta">
                        {formatPrice(event.price)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={status?.tone ?? "neutral"} dot>
                          {status?.label ?? event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          id={event.id}
                          slug={event.slug}
                          title={event.title}
                          status={event.status}
                          isPublic={event.status === "PUBLISHED" || event.status === "SOLD_OUT"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="space-y-3 md:hidden">
            {result.events.map((event) => {
              const status = STATUS_META[event.status as EventStatus];
              return (
                <li
                  key={event.id}
                  className="overflow-hidden rounded-lg border border-line bg-surface-container-lowest"
                >
                  <div className="flex gap-3 p-3">
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
                      <p className="line-clamp-2 text-label-md font-semibold text-ink">
                        {event.title}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-sm text-meta">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="size-3.5" />
                          {formatDateMedium(event.startDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <UsersIcon className="size-3.5" />
                          {event.attendees}/{event.capacity}
                        </span>
                        <span className="tabular">{formatPrice(event.price)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-surface-variant px-3 py-2">
                    <Badge tone={status?.tone ?? "neutral"} dot>
                      {status?.label ?? event.status}
                    </Badge>
                    <RowActions
                      id={event.id}
                      slug={event.slug}
                      title={event.title}
                      status={event.status}
                      isPublic={event.status === "PUBLISHED" || event.status === "SOLD_OUT"}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            className="mt-6"
            page={result.page}
            pageCount={result.totalPages}
            totalItems={result.total}
            buildHref={(page) => buildHref(rawParams, page, query.perPage)}
          />
        </>
      )}
    </>
  );
}

function RowActions({
  id,
  slug,
  title,
  status,
  isPublic,
}: {
  id: string;
  slug: string;
  title: string;
  status: string;
  isPublic: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      {isPublic && (
        <Link
          href={`/events/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${title} on the public site (opens in a new tab)`}
          title="View public page"
          className="inline-flex size-8 items-center justify-center rounded-md text-meta transition-colors hover:bg-surface-container hover:text-ink"
        >
          <ExternalLinkIcon className="size-4" />
        </Link>
      )}
      <Link
        href={`/admin/events/${id}/edit`}
        aria-label={`Edit ${title}`}
        title="Edit"
        className="inline-flex size-8 items-center justify-center rounded-md text-primary transition-colors hover:bg-surface-container"
      >
        <EditIcon className="size-4" />
      </Link>
      <DeleteEventButton id={id} title={title} status={status} compact />
    </div>
  );
}

/** Rebuilds the admin list URL, replacing only the page number. */
function buildHref(
  raw: Record<string, string | undefined>,
  page: number,
  perPage: number | undefined,
): Route {
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value && key !== "page" && key !== "deleted") params[key] = value;
  }
  params.perPage = String(perPage ?? 9);
  if (page > 1) params.page = String(page);
  return href("/admin/events", params);
}
