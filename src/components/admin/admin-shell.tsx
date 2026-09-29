"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import type { IconComponent } from "@/components/icons";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { logoutAction } from "@/app/actions/auth";
import {
  CalendarIcon,
  ChartIcon,
  CloseIcon,
  GridIcon,
  HomeIcon,
  LogoutIcon,
  MenuIcon,
  PlusIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Admin console shell.
 *
 * Responsive per the design spec:
 *  • mobile  (<640px)  — icon rail, nav collapsed behind a disclosure;
 *  • tablet  (640px+) — full sidebar with labels;
 *  • desktop (1024px+) — sidebar plus a sticky page header.
 *
 * Nav links are real `Link`s so middle-click and "open in new tab" behave, and
 * the active item is marked with `aria-current="page"`.
 */
export function AdminShell({
  adminName,
  adminEmail,
  children,
}: {
  adminName: string;
  adminEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  const nav: { href: Route; label: string; icon: IconComponent; exact: boolean }[] = [
    { href: "/admin", label: "Dashboard", icon: ChartIcon, exact: true },
    { href: "/admin/events", label: "All events", icon: CalendarIcon, exact: false },
    { href: "/admin/events/new", label: "Create event", icon: PlusIcon, exact: true },
  ];

  function isActive(item: (typeof nav)[number]) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar (mobile: full width, toggled; tablet+: always visible). */}
      <aside
        // `aria-controls` on the disclosure points here, so this id has to be on
        // the element the button actually toggles — not on the page content.
        id="admin-navigation"
        className={cn(
          "flex flex-col border-b border-line bg-surface-container-lowest lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-b-0",
          navOpen ? "block" : "hidden lg:flex",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-line px-4 lg:h-20">
          <Link href="/admin" onClick={() => setNavOpen(false)}>
            <Logo compact />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <CloseIcon className="size-5" />
          </Button>
        </div>

        <nav aria-label="Admin" className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-label-md font-label-md transition-colors",
                  active
                    ? "bg-primary-container text-ink"
                    : "text-ink hover:bg-surface-container",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="!my-3 border-t border-surface-variant" />

          <Link
            href="/"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-label-md font-label-md text-meta transition-colors hover:bg-surface-container hover:text-ink"
          >
            <HomeIcon className="size-5 shrink-0" />
            View public site
          </Link>
          <Link
            href="/api/events"
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-label-md font-label-md text-meta transition-colors hover:bg-surface-container hover:text-ink"
          >
            <GridIcon className="size-5 shrink-0" />
            API reference
          </Link>
        </nav>

        <div className="border-t border-line p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md bg-surface-container-low px-3 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-label-md font-semibold text-ink">
              {adminName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-md font-semibold text-ink">{adminName}</p>
              <p className="truncate text-body-sm text-meta">{adminEmail}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <SignOutButton />
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-line bg-surface-container-lowest px-4 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={navOpen}
            aria-controls="admin-navigation"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
          >
            <MenuIcon className="size-5" />
          </Button>
          <Logo />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" size="sm" full disabled={pending} className="justify-start">
      {pending ? <Spinner label="Signing out" /> : <LogoutIcon className="size-4" />}
      Sign out
    </Button>
  );
}
