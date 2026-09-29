import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Small status/label pill. Tones map to the semantic colours in the design's
 * "Colors" section (event type, publish state, result feedback) and reuse the
 * tone vocabulary from `STATUS_META`, so a status flows from the service layer
 * to the badge without a translation table.
 *
 * `primary` and `brand` are aliases — the brand doc calls the amber pill
 * "brand" while the event form calls it "primary".
 */
export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical"
  | "info"
  | "primary"
  | "brand";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant border-surface-variant",
  success: "bg-success-container text-on-success-container border-[#4d8c31]",
  warning: "bg-warning-container text-on-warning-container border-[#8a5b00]",
  critical: "bg-critical-container text-on-critical-container border-[#ffb3bf]",
  info: "bg-info-container text-on-info-container border-[#4a6382]",
  primary: "bg-primary-container text-ink border-[#d67f00]",
  brand: "bg-primary-container text-ink border-[#d67f00]",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  dot?: boolean;
};

export function Badge({ tone = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-label-sm font-label-md whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}
