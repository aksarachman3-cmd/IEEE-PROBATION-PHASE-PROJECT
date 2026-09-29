"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/states";
import { AlertCircleIcon, CloseIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Accessible modal dialog.
 *
 * Implements the three things a native `<dialog>` would otherwise leave to
 * hand-rolled code:
 *  - focus moves into the dialog on open and is trapped while it is open;
 *  - Escape closes it;
 *  - background scroll is locked and the rest of the page is inert to AT.
 *
 * Rendered through a portal so it escapes any `overflow: hidden` or stacking
 * context on the page.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // No "mounted" guard is needed: `open` only ever becomes true from a click, so
  // the server render and the first client render both produce `null` and there
  // is no hydration mismatch to avoid.
  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      // Focus trap.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-on-secondary-fixed/50"
        onClick={busy ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-desc" : undefined}
        className="relative w-full max-w-md rounded-lg border border-line bg-surface-container-lowest p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded p-1 text-meta transition-colors hover:bg-surface-container hover:text-ink"
        >
          <CloseIcon className="size-5" />
        </button>

        <div
          className={cn(
            "mb-4 flex size-11 items-center justify-center rounded-full",
            tone === "danger" ? "bg-critical-container text-critical" : "bg-info-container text-info",
          )}
        >
          <AlertCircleIcon className="size-6" />
        </div>

        <h2 id="dialog-title" className="font-display-sm text-ink">
          {title}
        </h2>
        {description && (
          <p id="dialog-desc" className="mt-1.5 text-body-md text-meta">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner label="Working" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
