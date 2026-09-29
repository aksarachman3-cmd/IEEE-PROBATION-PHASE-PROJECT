import type { Metadata } from "next";
import { AdminEventTable } from "@/components/admin/event-table";
import { getAdminStats, listEvents } from "@/lib/services/event-service";
import { DEFAULT_QUERY, eventQuerySchema } from "@/lib/validation/event";

/**
 * Admin event list with filters, search, status tabs and pagination.
 *
 * Query parameters are validated with the same schema the public catalog uses,
 * so the two never disagree about what a valid filter is.
 */
export const metadata: Metadata = { title: "All events" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const parsed = eventQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : DEFAULT_QUERY;
  // Flash flags set by the create/delete actions and consumed once by the table.
  const notice = flat.created === "1" ? "created" : flat.deleted === "1" ? "deleted" : null;

  const [list, stats] = await Promise.all([
    listEvents(query, "admin"),
    getAdminStats(),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AdminEventTable result={list} stats={stats} query={query} rawParams={flat} notice={notice} />
    </div>
  );
}
