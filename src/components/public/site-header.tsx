"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { Button, buttonStyles } from "@/components/ui/button";
import { CloseIcon, LockIcon, MenuIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Public site header.
 *
 * Desktop: single row with inline nav (as in the catalog mockup).
 * Mobile: the nav collapses behind a disclosure button; the panel is a normal
 * in-flow block rather than an overlay, so it can never trap the page behind a
 * backdrop, and Escape closes it.
 */
export function SiteHeader({
  searchSlotDesktop,
  searchSlotMobile,
}: {
  /**
   * Rendered once for the desktop row and once for mobile. Passed as two
   * separate ReactNode props (instead of a single render function) because
   * SiteHeader is a Client Component — functions cannot be passed from a
   * Server Component across the boundary. Each slot receives its own element
   * so the `id` on the search input stays unique, which keeps the
   * `<label for>` association valid for screen-reader users.
   */
  searchSlotDesktop?: React.ReactNode;
  searchSlotMobile?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  // Remember the path the menu was opened on. Navigating resets `menuOpen`
  // during render rather than in an effect, which avoids a second render pass
  // where the panel would still be open behind the new page.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (pathname !== menuPathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const links: { href: Route; label: string }[] = [
    { href: "/", label: "All Events" },
    { href: "/?when=upcoming", label: "Upcoming" },
    { href: "/?when=past", label: "Past" },
    { href: "/?price=free", label: "Free" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="border-b border-surface-variant bg-surface-container-lowest">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <p className="truncate text-body-sm text-meta">
            <span className="font-semibold text-ink">IEEE ITB Student Branch</span>
            <span className="mx-2 text-surface-variant">|</span>
            Bandung, Indonesia
          </p>
          <Link
            href="/admin/login"
            className="flex shrink-0 items-center gap-1.5 text-body-sm font-semibold text-primary transition-colors hover:text-on-primary-container"
          >
            <LockIcon className="size-3.5" />
            Admin
          </Link>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="IEEE ITB Events home" className="shrink-0">
          <Logo />
        </Link>

        {searchSlotDesktop && (
          <div className="ml-auto hidden flex-1 justify-end md:flex">
            {searchSlotDesktop}
          </div>
        )}

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 text-label-md font-label-md text-ink transition-colors hover:bg-surface-container"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {searchSlotMobile && (
            // Capped so the field never squeezes the menu button off-screen on
            // narrow phones.
            <div className="max-w-[min(14rem,45vw)] flex-1 md:hidden">
              {searchSlotMobile}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!menuOpen}
        className="border-t border-line bg-surface-container-lowest lg:hidden"
      >
        <nav aria-label="Mobile" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2.5 text-label-md font-label-md text-ink transition-colors hover:bg-surface-container"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className={cn(buttonStyles({ variant: "secondary", full: true }), "mt-2")}
          >
            <LockIcon className="size-4" />
            Admin sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SearchIconButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-label="Search events">
      <SearchIcon className="size-5" />
    </Button>
  );
}
