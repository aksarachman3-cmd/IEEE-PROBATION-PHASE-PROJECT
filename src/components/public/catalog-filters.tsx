"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { CloseIcon, FilterIcon } from "@/components/icons";
import {
  CATEGORY_META,
  EVENT_CATEGORIES,
  EVENT_FORMATS,
  FORMAT_META,
  PAGE_SIZE_OPTIONS,
  PRICE_FILTER_LABELS,
  SORT_LABELS,
  TIME_FILTER_LABELS,
  TIME_FILTER_VALUES,
  type EventCategory,
  type EventFormat,
  type PriceFilter,
  type TimeFilter,
} from "@/lib/constants";
import type { CatalogFacets } from "@/lib/services/event-service";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Catalog filter bar.
 *
 * All filter state lives in the URL. That is the single source of truth, which
 * means: the server component re-queries on every change, the results are
 * bookmarkable, and there is no client/server state to drift out of sync.
 *
 * The advanced filters collapse behind a disclosure on mobile (the design has
 * no room for them above the fold) and are always visible from `lg` up.
 */
export function CatalogFilters({ facets }: { facets: CatalogFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const firstRender = useRef(true);

  const active = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      category: searchParams.get("category") ?? "all",
      format: searchParams.get("format") ?? "all",
      when: searchParams.get("when") ?? "all",
      price: searchParams.get("price") ?? "all",
      sort: searchParams.get("sort") ?? "featured",
      featured: searchParams.get("featured") === "true",
    }),
    [searchParams],
  );

  const activeCount =
    (active.q ? 1 : 0) +
    (active.category !== "all" ? 1 : 0) +
    (active.format !== "all" ? 1 : 0) +
    (active.when !== "all" ? 1 : 0) +
    (active.price !== "all" ? 1 : 0) +
    (active.featured ? 1 : 0);

  // Debounce-free immediate URL patch. `startTransition` keeps the current
  // results interactive while the new page streams in, instead of blocking on
  // the navigation.
  function update(key: string, value: string | null) {
    const params: Record<string, string | undefined> = {};
    for (const [existingKey, existingValue] of searchParams.entries()) {
      if (existingKey !== "page") params[existingKey] = existingValue;
    }
    if (value !== null && value !== "" && value !== "all" && value !== "false") {
      params[key] = value;
    } else {
      delete params[key];
    }
    startTransition(() => router.replace(href(pathname, params), { scroll: false }));
  }

  function clearAll() {
    // Keep `perPage` — that is a display preference, not a filter.
    startTransition(() => router.replace(href(pathname, { perPage: searchParams.get("perPage") })));
  }

  // Suppress the pending flash on the very first render.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
  }, []);

  const chips: { key: string; value: string; label: string }[] = [];
  if (active.category !== "all")
    chips.push({
      key: "category",
      value: active.category,
      label: CATEGORY_META[active.category as EventCategory]?.label ?? active.category,
    });
  if (active.format !== "all")
    chips.push({
      key: "format",
      value: active.format,
      label: FORMAT_META[active.format as EventFormat]?.label ?? active.format,
    });
  if (active.when !== "all")
    chips.push({ key: "when", value: active.when, label: TIME_FILTER_LABELS[active.when as TimeFilter] });
  if (active.price !== "all")
    chips.push({
      key: "price",
      value: active.price,
      label: PRICE_FILTER_LABELS[active.price as PriceFilter],
    });
  if (active.featured) chips.push({ key: "featured", value: "true", label: "Featured only" });
  if (active.q) chips.push({ key: "q", value: active.q, label: `“${active.q}”` });

  return (
    <div className="space-y-3">
      {/* Time window — the primary filter, always visible (design: pill row). */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden items-center gap-1.5 text-label-md font-label-md text-meta sm:flex">
          <FilterIcon className="size-4" />
          When
        </span>
        <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
          {TIME_FILTER_VALUES.map((value) => {
            const selected = active.when === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => update("when", value)}
                aria-pressed={selected}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3.5 text-label-md font-label-md transition-colors",
                  selected
                    ? "border-[#d67f00] bg-primary-container text-ink"
                    : "border-line bg-surface-container-lowest text-ink hover:border-line-strong hover:bg-[#f7fafa]",
                )}
              >
                {TIME_FILTER_LABELS[value]}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="catalog-sort" className="hidden text-label-md text-meta sm:block">
            Sort
          </label>
          <Select
            id="catalog-sort"
            value={active.sort}
            onChange={(event) => update("sort", event.target.value)}
            className="h-8 w-auto min-w-[9.5rem] text-label-md"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="catalog-advanced"
            onClick={() => setOpen((value) => !value)}
          >
            <FilterIcon className="size-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary-container text-[0.65rem] font-bold text-ink">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced filters */}
      <div id="catalog-advanced" hidden={!open} className={cn("lg:block", !open && "lg:hidden")}>
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            id="filter-category"
            label="Category"
            value={active.category}
            onChange={(value) => update("category", value)}
            options={[
              { value: "all", label: "All categories" },
              ...EVENT_CATEGORIES.map((value) => ({
                value,
                label: `${CATEGORY_META[value].label} (${facets.category[value] ?? 0})`,
              })),
            ]}
          />
          <FilterSelect
            id="filter-format"
            label="Format"
            value={active.format}
            onChange={(value) => update("format", value)}
            options={[
              { value: "all", label: "Any format" },
              ...EVENT_FORMATS.map((value) => ({
                value,
                label: `${FORMAT_META[value].label} (${facets.format[value] ?? 0})`,
              })),
            ]}
          />
          <FilterSelect
            id="filter-price"
            label="Price"
            value={active.price}
            onChange={(value) => update("price", value)}
            options={[
              { value: "all", label: "Any price" },
              ...Object.entries(PRICE_FILTER_LABELS)
                .filter(([value]) => value !== "all")
                .map(([value, label]) => ({ value, label })),
            ]}
          />
          <FilterSelect
            id="filter-per-page"
            label="Results per page"
            value={searchParams.get("perPage") ?? "9"}
            onChange={(value) => update("perPage", value)}
            options={PAGE_SIZE_OPTIONS.map((value) => ({ value: String(value), label: `${value} per page` }))}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label-md text-meta">
            {activeCount} {activeCount === 1 ? "filter" : "filters"} applied:
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => update(chip.key, null)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-container px-2.5 py-1 text-label-md text-ink transition-colors hover:border-line-strong hover:bg-surface-container-high"
            >
              {chip.label}
              <CloseIcon className="size-3.5" />
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-2 py-1 text-label-md font-semibold text-primary underline underline-offset-2 transition-colors hover:text-on-primary-container"
          >
            Clear all
          </button>
        </div>
      )}

      {pending && (
        <p role="status" className="text-body-sm text-meta">
          Updating results…
        </p>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-label-md text-ink">
        {label}
      </label>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
