import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { getAdminStats, listEvents } from "@/lib/services/event-service";
import { DEFAULT_QUERY } from "@/lib/validation/event";
import { Badge } from "@/components/ui/badge";
import { EmptyState, StatsSkeleton, TableSkeleton } from "@/components/ui/states";
import { buttonStyles } from "@/components/ui/button";
import {
  CalendarIcon,
  ChartIcon,
  InboxIcon,
  PlusIcon,
  StarIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import { formatDateMedium, formatPrice, formatRelativeDay } from "@/lib/format";
import { STATUS_META, type EventStatus } from "@/lib/constants";

/**
 * Admin dashboard.
 *
 * Read-only overview: headline counts, the next events, and anything sitting in
 * a state that needs attention. Every mutation lives on its own page.
 */
export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [stats, { events: upcoming }] = await Promise.all([
    getAdminStats(),
    // Drafts and upcoming published events, soonest first.
    listEvents({ ...DEFAULT_QUERY, when: "upcoming", sort: "date_asc", perPage: 5 }, "admin"),
  ]);

  // `key` is a status suffix (not an `EventStatus` itself) so a status can also
  // be turned into its own `STATUS_META` lookup below.
  const needsAttention: { key: string; label: string; value: number; href: Route }[] = [
    { key: "draft", label: "Draft", value: stats.draft, href: "/admin/events?status=DRAFT" },
    {
      key: "cancelled",
      label: "Cancelled",
      value: stats.cancelled,
      href: "/admin/events?status=CANCELLED",
    },
    {
      key: "archived",
      label: "Archived",
      value: stats.archived,
      href: "/admin/events?status=ARCHIVED",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display-sm text-ink">Dashboard</h1>
          <p className="mt-1 text-body-md text-meta">
            Overview of the event catalog and what needs your attention.
          </p>
        </div>
        <Link href="/admin/events/new" className={buttonStyles({ variant: "primary" })}>
          <PlusIcon className="size-4" />
          Create event
        </Link>
      </header>

      {/* Headline metrics */}
      <section aria-label="Key metrics">
        <Suspense fallback={<StatsSkeleton />}>
          <StatGrid stats={stats} />
        </Suspense>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Needs attention */}
        <section
          aria-labelledby="attention-heading"
          className="overflow-hidden rounded-lg border border-line bg-surface-container-lowest lg:col-span-1"
        >
          <div className="border-b border-line px-5 py-4">
            <h2 id="attention-heading" className="font-display-xs text-ink">
              Needs attention
            </h2>
            <p className="mt-0.5 text-body-sm text-meta">Events not visible to the public.</p>
          </div>

          {needsAttention.every((item) => item.value === 0) ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-success-container text-on-success-container">
                <ChartIcon className="size-5" />
              </div>
              <p className="text-body-md font-semibold text-ink">Everything is in order</p>
              <p className="mt-1 text-body-sm text-meta">No drafts, cancellations or archives.</p>
            </div>
          ) : (
            <ul className="divide-y divide-surface-variant">
              {needsAttention
                .filter((item) => item.value > 0)
                .map((item) => (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-[#f7fafa]"
                    >
                      <span className="text-body-md text-ink">{item.label}</span>
                      <Badge
                        tone={STATUS_META[item.key.toUpperCase() as EventStatus]?.tone ?? "neutral"}
                      >
                        {item.value}
                      </Badge>
                    </Link>
                  </li>
                ))}
            </ul>
          )}

          <div className="border-t border-line p-3">
            <Link
              href="/admin/events"
              className="flex items-center justify-center gap-1.5 rounded-md py-2 text-label-md font-semibold text-primary transition-colors hover:bg-surface-container"
            >
              Manage all events
            </Link>
          </div>
        </section>

        {/* Upcoming */}
        <section
          aria-labelledby="upcoming-heading"
          className="overflow-hidden rounded-lg border border-line bg-surface-container-lowest lg:col-span-2"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 id="upcoming-heading" className="font-display-xs text-ink">
                Next events
              </h2>
              <p className="mt-0.5 text-body-sm text-meta">Soonest first, including drafts.</p>
            </div>
            <Link
              href="/admin/events?when=upcoming"
              className="text-label-md font-semibold text-primary transition-colors hover:text-on-primary-container"
            >
              View all
            </Link>
          </div>

          <Suspense fallback={<TableSkeleton rows={4} columns={4} />}>
            {upcoming.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={<InboxIcon className="size-6" />}
                  title="No upcoming events"
                  description="Create your first event to start building the public catalog."
                  className="border-0 py-8"
                  action={
                    <Link href="/admin/events/new" className={buttonStyles({ variant: "primary" })}>
                      <PlusIcon className="size-4" />
                      Create event
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-surface-variant">
                {upcoming.map((event) => {
                  const status = STATUS_META[event.status as EventStatus];
                  return (
                    <li key={event.id}>
                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-[#f7fafa]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-label-md font-semibold text-ink">
                            {event.isFeatured && <StarIcon className="size-3.5 text-primary" />}
                            <span className="truncate">{event.title}</span>
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-meta">
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

                        <Badge tone={status?.tone ?? "neutral"} dot>
                          {status?.label ?? event.status}
                        </Badge>
                        <span className="w-20 text-right text-body-sm text-meta">
                          {formatRelativeDay(event.startDate)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Suspense>
        </section>
      </div>
    </div>
  );
}

function StatGrid({ stats }: { stats: Awaited<ReturnType<typeof getAdminStats>> }) {
  const cards = [
    { label: "Total events", value: stats.total, icon: CalendarIcon, tone: "text-primary" },
    { label: "Published", value: stats.published, icon: ChartIcon, tone: "text-success" },
    { label: "Upcoming", value: stats.upcoming, icon: TrendingUpIcon, tone: "text-info" },
    { label: "Total revenue", value: formatPrice(stats.revenue), icon: WalletIcon, tone: "text-primary" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="rounded-lg border border-line bg-surface-container-lowest p-5"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-label-md text-meta">{card.label}</p>
              <Icon className={`size-5 shrink-0 ${card.tone}`} />
            </div>
            <p className="tabular mt-2 font-display-sm text-ink">{card.value}</p>
            {card.label === "Total events" && (
              <p className="mt-1 text-body-sm text-meta">{stats.freeEvents} free to attend</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
