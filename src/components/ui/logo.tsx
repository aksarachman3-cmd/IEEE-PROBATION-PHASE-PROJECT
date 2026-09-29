import { cn } from "@/lib/utils";
import { APP_NAME, ORG_NAME } from "@/lib/constants";

/**
 * IEEE-style wordmark.
 *
 * The designs use a "circuit chip" glyph. This is a small inline SVG so it
 * scales, inherits colour, and costs no network request.
 */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8 shrink-0 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="7" y="7" width="18" height="18" rx="3" />
        <rect x="12" y="12" width="8" height="8" rx="1" />
        <path d="M12 2v5M20 2v5M12 25v5M20 25v5M2 12h5M2 20h5M25 12h5M25 20h5" />
      </svg>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display-xs tracking-tight text-ink">{APP_NAME}</span>
          <span className="mt-0.5 text-body-sm text-meta">{ORG_NAME}</span>
        </span>
      )}
    </span>
  );
}
