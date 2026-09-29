import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Button styles shared by `<button>`, `<Link>` and form submit buttons so
 * every clickable surface in the app looks identical.
 *
 * The primary variant follows the design spec: amber `#FF9900` surface with
 * near-black ink, a 4px radius, and a 1px darker border rather than a shadow.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-container text-ink border border-[#d67f00] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-[#e88b00] active:bg-[#d67f00] disabled:bg-[#f3c47a] disabled:text-[#7a6a52] disabled:border-[#e0c79a]",
  secondary:
    "bg-surface-container-lowest text-ink border border-line hover:bg-[#f7fafa] hover:border-line-strong active:bg-surface-container",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-surface-container",
  danger:
    "bg-critical text-white border border-[#8f0726] hover:bg-[#a1082c] active:bg-[#8f0726]",
  dark:
    "bg-on-secondary-fixed text-surface-container-lowest border border-on-secondary-fixed hover:bg-on-secondary-fixed-variant",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-label-md gap-1.5 rounded",
  md: "h-10 px-4 text-label-md gap-2 rounded",
  lg: "h-11 px-6 text-label-md gap-2 rounded-lg",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className,
  full,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  full?: boolean;
} = {}) {
  return cn(
    "inline-flex items-center justify-center font-label-md whitespace-nowrap select-none",
    "transition-colors duration-100",
    "disabled:cursor-not-allowed disabled:opacity-70",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    className,
  );
}

// `ComponentPropsWithRef` (rather than `ButtonHTMLAttributes`) so callers can
// pass `ref` — React 19 forwards refs to function components as a normal prop.
type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
};

export function Button({ variant, size, full, className, type, ...props }: ButtonProps) {
  return (
    <button
      // Buttons inside forms default to `submit`, which is rarely what a dialog
      // footer or filter chip wants.
      type={type ?? "button"}
      className={buttonStyles({ variant, size, full, className })}
      {...props}
    />
  );
}
