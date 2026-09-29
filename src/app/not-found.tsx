import Link from "next/link";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { CalendarIcon, SearchIcon } from "@/components/icons";

/**
 * 404 for unknown URLs and for events that are not publicly visible.
 *
 * The same page handles both cases on purpose: if a draft event 404'd with a
 * different message ("this event is a draft"), that would leak the existence of
 * unpublished events to anyone who guessed a slug.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
          <SearchIcon className="size-8" />
        </div>

        <p className="mt-6 font-mono text-body-sm tracking-[0.2em] text-meta uppercase">Error 404</p>
        <h1 className="mt-2 font-display-lg text-ink">We could not find that page</h1>
        <p className="mt-3 text-body-md text-meta">
          The link may be broken, or the event may have been unpublished, archived or cancelled. Try
          searching the catalog instead.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#d67f00] bg-primary-container px-6 text-label-md font-semibold text-ink transition-colors hover:bg-[#e88b00]"
          >
            <CalendarIcon className="size-4" />
            Browse all events
          </Link>
          <Link
            href="/?when=upcoming"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-surface-container-lowest px-6 text-label-md font-semibold text-ink transition-colors hover:border-line-strong"
          >
            See upcoming only
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
