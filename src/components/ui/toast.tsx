"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircleIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Lightweight toast system.
 *
 * Server Actions return a serialisable result; the client form components feed
 * that result into `toast()`. Messages are announced via `aria-live` so
 * feedback is not visual-only — this is the main way a screen-reader user
 * learns that a save succeeded or that a field was rejected.
 */

export type ToastTone = "success" | "error" | "info";

type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, { wrap: string; icon: ReactNode }> = {
  success: {
    wrap: "bg-[#10380f] border-[#1c5c19]",
    icon: <CheckCircleIcon className="size-5 text-[#a5e3a1]" />,
  },
  error: {
    wrap: "bg-[#410008] border-[#8f0726]",
    icon: <AlertCircleIcon className="size-5 text-[#ffb3bf]" />,
  },
  info: {
    wrap: "bg-[#101c2b] border-[#3c4858]",
    icon: <InfoIcon className="size-5 text-[#9fc3e8]" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, tone, message }]);
    },
    [],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push],
  );

  // Auto-dismiss; errors linger longer because they usually need reading.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), t.tone === "error" ? 8000 : 5000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
              TONE_STYLES[toast.tone].wrap,
            )}
          >
            {TONE_STYLES[toast.tone].icon}
            <p className="flex-1 text-body-md text-surface-container-lowest">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-m-1 rounded p-1 text-white/70 transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}
