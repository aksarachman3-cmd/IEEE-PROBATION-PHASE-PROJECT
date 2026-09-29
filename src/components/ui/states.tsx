"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { AlertCircleIcon, CloudOffIcon, InboxIcon, RefreshIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Inline spinner. `label` becomes the accessible name for screen readers. */
export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        className="size-4 animate-spin text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" className="opacity-20" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Shown when a query succeeds but returns nothing — e.g. no events match the
 * current filters. Always offers a way forward (clear filters / create).
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-line",
        "bg-surface-container-lowest px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-container text-meta">
        {icon ?? <InboxIcon className="size-6" />}
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="font-display-sm text-ink">{title}</h3>
        {description && <p className="text-body-md text-meta">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * Shown when a query fails — network, database, or an unexpected server error.
 * `onRetry` is optional: when the caller has no client handler we render a
 * plain reload link so the state is still recoverable.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const retry = onRetry ?? (() => router.refresh());

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-[#ffb3bf]",
        "bg-critical-container px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-surface text-critical">
        <CloudOffIcon className="size-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h3 className="font-display-sm text-on-critical-container">{title}</h3>
        <p className="text-body-md text-[#410008]">
          {description ?? "We could not load this content. Please check your connection and try again."}
        </p>
      </div>
      <button type="button" onClick={retry} className={buttonStyles({ variant: "secondary" })}>
        <RefreshIcon className="size-4" />
        Try again
      </button>
    </div>
  );
}

/** Inline alert used inside forms and detail pages. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "danger" | "warning" | "success";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info bg-info-container text-on-info-container",
    danger: "border-[#ffb3bf] bg-critical-container text-on-critical-container",
    warning: "border-warning bg-warning-container text-on-warning-container",
    success: "border-success bg-success-container text-on-success-container",
  } as const;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-md border px-4 py-3", tones[tone], className)}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
      <div className="space-y-1">
        {title && <p className="font-label-md">{title}</p>}
        <div className="text-body-md">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------- skeletons -------------------------------- */

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-surface-container", className)}>
      <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

/** Grid of event cards, mirroring the catalog layout so the swap is seamless. */
export function EventCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface-container-lowest">
      <Shimmer className="h-40 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-5">
        <Shimmer className="h-3 w-24" />
        <Shimmer className="h-5 w-full" />
        <Shimmer className="h-5 w-2/3" />
        <div className="space-y-2 pt-1">
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-4/5" />
        </div>
        <Shimmer className="h-4 w-32" />
      </div>
    </div>
  );
}

export function EventGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading events"
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading" className="overflow-hidden rounded-lg border border-line">
      <div className="border-b border-line bg-surface-container-low">
        <div className="flex gap-4 p-4">
          {Array.from({ length: columns }, (_, i) => (
            <Shimmer key={i} className={cn("h-3", i === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-surface-variant p-4 last:border-0">
          {Array.from({ length: columns }, (_, c) => (
            <Shimmer key={c} className={cn("h-4", c === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading statistics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="h-24 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading event" className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <Shimmer className="h-8 w-40" />
      <Shimmer className="h-72 w-full rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Shimmer className="h-9 w-3/4" />
          <Shimmer className="h-5 w-1/2" />
          <Shimmer className="h-40 w-full" />
        </div>
        <Shimmer className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
