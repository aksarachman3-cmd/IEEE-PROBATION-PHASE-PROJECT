import { EventGridSkeleton } from "@/components/ui/states";

/**
 * Streaming loading UI for the catalogue.
 *
 * Shown while the server component queries the database. The skeletons mirror
 * the real grid (1 / 2 / 3 columns, same card proportions) so the layout does
 * not jump when the data arrives, and the whole block is announced via
 * `role="status"` rather than being purely visual.
 */
export default function CatalogLoading() {
  return (
    <>
      <div className="border-b border-line bg-surface-container-lowest">
        <div className="mx-auto flex h-9 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="h-3 w-48 rounded bg-surface-container" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-2">
          <div className="h-7 w-52 rounded bg-surface-container" />
          <div className="h-4 w-32 rounded bg-surface-container" />
        </div>

        <div className="mb-6 h-10 w-full rounded-md bg-surface-container" />

        <EventGridSkeleton count={9} />
      </div>
    </>
  );
}
