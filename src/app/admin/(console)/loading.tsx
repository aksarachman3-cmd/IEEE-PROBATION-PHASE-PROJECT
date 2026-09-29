import { StatsSkeleton, TableSkeleton } from "@/components/ui/states";

/**
 * Streaming loading UI for the dashboard.
 *
 * Skeletons mirror the real layout: a four-up metric row, then the two panels
 * below. Streaming means the shell and skeletons appear immediately while the
 * server component queries the database, instead of a blank page.
 */
export default function AdminDashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-40 rounded bg-surface-container" />
        <div className="h-4 w-80 max-w-full rounded bg-surface-container" />
      </div>

      <StatsSkeleton />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="h-72 w-full rounded-lg border border-line bg-surface-container-lowest" />
        </div>
        <div className="lg:col-span-2">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    </div>
  );
}
