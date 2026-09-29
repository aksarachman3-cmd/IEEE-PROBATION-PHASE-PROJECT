"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * Every control is wired for accessibility up front: the label is associated
 * via `htmlFor`/`id`, the hint and error text are linked with
 * `aria-describedby`, and invalid controls announce themselves with
 * `aria-invalid`. Error text uses `role="alert"` so screen readers announce it
 * the moment it appears, without stealing focus.
 */

const CONTROL_BASE =
  "w-full rounded-md border bg-surface-container-lowest text-body-md text-ink " +
  "placeholder:text-[#9a9d9d] transition-colors duration-100 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container focus-visible:ring-offset-0";

const CONTROL_OK = "border-line hover:border-line-strong";
const CONTROL_ERR = "border-critical bg-[#fff8f8]";

function describedBy(hintId: string | undefined, errorId: string | undefined, hasError: boolean) {
  return [hasError ? errorId : null, hintId].filter(Boolean).join(" ") || undefined;
}

/* ---------------------------------- Field --------------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-label-md font-label-md text-ink">
        {label}
        {required && (
          <span className="ml-0.5 text-critical" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-body-sm text-meta">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-body-sm text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- Input --------------------------------- */

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  invalid?: boolean;
};

export function Input({ invalid, className, id, ...props }: InputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <input
      id={inputId}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(props["aria-describedby"], `${inputId}-error`, Boolean(invalid))}
      className={cn(
        CONTROL_BASE,
        "h-10 px-3",
        invalid ? CONTROL_ERR : CONTROL_OK,
        "disabled:cursor-not-allowed disabled:bg-surface-container",
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------- Textarea -------------------------------- */

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export function Textarea({ invalid, className, id, rows = 5, ...props }: TextareaProps) {
  const fallbackId = useId();
  const areaId = id ?? fallbackId;
  return (
    <textarea
      id={areaId}
      rows={rows}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(props["aria-describedby"], `${areaId}-error`, Boolean(invalid))}
      className={cn(
        CONTROL_BASE,
        "resize-y px-3 py-2 leading-relaxed",
        invalid ? CONTROL_ERR : CONTROL_OK,
        "disabled:cursor-not-allowed disabled:bg-surface-container",
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Select --------------------------------- */

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export function Select({ invalid, className, id, children, ...props }: SelectProps) {
  const fallbackId = useId();
  const selectId = id ?? fallbackId;
  return (
    <div className="relative">
      <select
        id={selectId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy(props["aria-describedby"], `${selectId}-error`, Boolean(invalid))}
        className={cn(
          CONTROL_BASE,
          "h-10 appearance-none pl-3 pr-9",
          invalid ? CONTROL_ERR : CONTROL_OK,
          "cursor-pointer disabled:cursor-not-allowed disabled:bg-surface-container",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-meta"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

/* -------------------------------- Checkbox -------------------------------- */

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  description?: string;
};

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const fallbackId = useId();
  const boxId = id ?? fallbackId;
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        type="checkbox"
        id={boxId}
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#8a5100] disabled:cursor-not-allowed"
        {...props}
      />
      <label htmlFor={boxId} className="cursor-pointer select-none">
        <span className="block text-label-md font-label-md text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-body-sm text-meta">{description}</span>}
      </label>
    </div>
  );
}
