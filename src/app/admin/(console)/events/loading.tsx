import { TableSkeleton } from "@/components/ui/states";

/** Streaming loading UI for the admin events table. */
export default function AdminEventsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded bg-surface-container" />
          <div className="h-4 w-64 max-w-full rounded bg-surface-container" />
        </div>
        <div className="h-10 w-32 rounded-md bg-surface-container" />
      </div>

      <div className="mb-4 flex gap-1.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-surface-container" />
        ))}
      </div>

      <div className="mb-5 h-[4.5rem] rounded-lg border border-line bg-surface-container-lowest" />

      <TableSkeleton rows={9} columns={6} />
    </div>
  );
}
