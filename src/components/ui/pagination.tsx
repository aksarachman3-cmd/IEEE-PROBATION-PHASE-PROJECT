import Link from "next/link";
import type { Route } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Pagination for the catalog.
 *
 * Pages are links, not buttons: results stay bookmarkable and shareable, and
 * the browser's back button works. `buildHref` receives the target page and
 * must preserve the active filters.
 *
 * Shows a condensed window (`1 … 4 5 6 … 12`) so the control never wraps on
 * mobile.
 */
export function Pagination({
  page,
  pageCount,
  totalItems,
  buildHref,
  className,
}: {
  page: number;
  pageCount: number;
  totalItems: number;
  buildHref: (page: number) => Route;
  className?: string;
}) {
  if (pageCount <= 1) return null;

  const pages = paginationWindow(page, pageCount);

  const navItem =
    "flex size-9 items-center justify-center rounded-md border text-body-md transition-colors";
  const navIdle = "border-line bg-surface-container-lowest text-ink hover:border-line-strong hover:bg-[#f7fafa]";
  const navActive = "border-[#d67f00] bg-primary-container font-semibold text-ink";

  return (
    <nav
      aria-label="Catalog pagination"
      className={cn("flex flex-col items-center gap-3 sm:flex-row sm:justify-between", className)}
    >
      <p className="text-body-sm text-meta">
        Page <span className="font-semibold text-ink">{page}</span> of {pageCount}
        <span className="mx-2 text-surface-variant">|</span>
        {totalItems.toLocaleString("en-US")} {totalItems === 1 ? "event" : "events"}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} rel="prev" aria-label="Previous page" className={cn(navItem, navIdle)}>
            <ChevronLeftIcon className="size-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={cn(navItem, "cursor-not-allowed border-surface-variant bg-surface-container text-surface-variant")}>
            <ChevronLeftIcon className="size-4" />
          </span>
        )}

        {pages.map((entry, index) =>
          entry === null ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-body-md text-meta">
              …
            </span>
          ) : (
            <Link
              key={entry}
              href={buildHref(entry)}
              aria-current={entry === page ? "page" : undefined}
              aria-label={`Page ${entry}`}
              className={cn(navItem, entry === page ? navActive : navIdle)}
            >
              {entry}
            </Link>
          ),
        )}

        {page < pageCount ? (
          <Link href={buildHref(page + 1)} rel="next" aria-label="Next page" className={cn(navItem, navIdle)}>
            <ChevronRightIcon className="size-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={cn(navItem, "cursor-not-allowed border-surface-variant bg-surface-container text-surface-variant")}>
            <ChevronRightIcon className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}

/** Builds a compact page list with `null` marking an elision. */
function paginationWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, pageCount, page]);
  for (const offset of [-2, -1, 1, 2]) {
    const candidate = page + offset;
    if (candidate > 1 && candidate < pageCount) pages.add(candidate);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  let previous = 0;

  for (const value of sorted) {
    if (previous && value - previous > 1) result.push(null);
    result.push(value);
    previous = value;
  }

  return result;
}
