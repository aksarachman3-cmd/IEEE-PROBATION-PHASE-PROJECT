"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Catalog search box.
 *
 * Typing updates the URL rather than local state, so a search is shareable,
 * survives a refresh, and works with the JavaScript-only progressive
 * enhancement below. The input is debounced to avoid one navigation per
 * keystroke; the `<form>` submit path still works immediately if you press
 * Enter, and is what no-JS visitors get.
 *
 * `useSearchParams` requires a Suspense boundary in a statically rendered
 * route, so the catalog page wraps this in one.
 */
export function CatalogSearch({ className, id = "catalog-search" }: { className?: string; id?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Distinguishes "the user cleared the box" from "the URL has no q param",
  // so we do not clobber the field while the user is mid-word.
  const lastPushed = useRef<string | null>(searchParams.get("q"));

  function push(next: string) {
    const params: Record<string, string | undefined> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key !== "page") params[key] = value; // any change resets pagination
    }
    if (next.trim()) params.q = next.trim();

    lastPushed.current = next.trim() || null;
    router.replace(href(pathname, params), { scroll: false });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 350);
  }

  // Respond to Back/Forward and to the "Clear all" button resetting the URL.
  useEffect(() => {
    const fromUrl = searchParams.get("q");
    if (fromUrl !== lastPushed.current) {
      setValue(fromUrl ?? "");
      lastPushed.current = fromUrl;
    }
  }, [searchParams]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <form
      role="search"
      className={cn("relative w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        push(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search events
      </label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search events, topics, or venues…"
        autoComplete="off"
        className={cn(
          "h-10 w-full rounded-md border border-line bg-surface-container-lowest pr-3 pl-9",
          "text-body-md text-ink placeholder:text-[#9a9d9d]",
          "transition-colors hover:border-line-strong",
          "focus:border-primary focus:ring-2 focus:ring-primary-container focus:outline-none",
        )}
      />
    </form>
  );
}
