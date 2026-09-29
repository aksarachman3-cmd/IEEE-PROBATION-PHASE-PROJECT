import Link from "next/link";
import type { Route } from "next";
import { Logo } from "@/components/ui/logo";
import { APP_NAME, ORG_NAME } from "@/lib/constants";

/**
 * Public footer. Column headings use `h2` visually downgraded to a label so the
 * page keeps a single logical `h1`; the columns themselves are `<nav>`s with
 * real `aria-label`s so the link groups are navigable by landmark.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line bg-surface-container-lowest">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-body-md text-meta">
            The official events platform of the {ORG_NAME}. Lectures, workshops, labs and community
            sessions run by students and alumni across Bandung.
          </p>
        </div>

        <nav aria-label="Browse events" className="space-y-2">
          <h2 className="text-label-md font-label-md text-ink">Browse</h2>
          <ul className="space-y-1.5">
            {(
              [
                { href: "/", label: "All events" },
                { href: "/?when=upcoming", label: "Upcoming" },
                { href: "/?when=past", label: "Past events" },
                { href: "/?price=free", label: "Free to attend" },
              ] satisfies { href: Route; label: string }[]
            ).map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </ul>
        </nav>

        <nav aria-label="Categories" className="space-y-2">
          <h2 className="text-label-md font-label-md text-ink">Categories</h2>
          <ul className="space-y-1.5">
            {(
              [
                { href: "/?category=TECHNICAL_CONFERENCE", label: "Conferences" },
                { href: "/?category=WORKSHOP", label: "Workshops" },
                { href: "/?category=HANDS_ON_LAB", label: "Hands-on labs" },
                { href: "/?category=COMMUNITY", label: "Community" },
              ] satisfies { href: Route; label: string }[]
            ).map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-surface-variant">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-body-sm text-meta sm:flex-row sm:px-6 lg:px-8">
          <p>
            &copy; {year} {ORG_NAME}. Built by the branch community.
          </p>
          <p className="flex items-center gap-1.5">
            <span>{APP_NAME}</span>
            <span aria-hidden="true">&middot;</span>
            <Link href="/admin/login" className="transition-colors hover:text-primary">
              Admin portal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Renders its own `<li>` so it can be mapped directly inside a `<ul>`. */
function FooterLink({ href, children }: { href: Route; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-block rounded text-body-md text-meta transition-colors hover:text-primary"
      >
        {children}
      </Link>
    </li>
  );
}
