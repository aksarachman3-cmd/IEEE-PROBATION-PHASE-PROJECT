"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/states";
import { ArrowLeftIcon, LockIcon, MailIcon } from "@/components/icons";

/**
 * Administrator sign-in form.
 *
 * Built on `useActionState`, so the action's returned `fieldErrors` are
 * rendered inline under the offending input and focus is not stolen from the
 * field the user was typing in. A failed attempt deliberately does not say
 * *which* of email/password was wrong — that would confirm which accounts
 * exist.
 */
export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, { status: "idle" });
  const fieldErrors = state.status === "error" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.status === "error" && state.message && (
        <Alert tone="danger" title="Sign in failed">
          {state.message}
        </Alert>
      )}

      <Field
        label="Email address"
        htmlFor="email"
        required
        error={fieldErrors?.email}
      >
        <div className="relative">
          <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="admin@ieee-itb.ac.id"
            required
            invalid={Boolean(fieldErrors?.email)}
            className="pl-9"
            // Re-populated so a failed attempt does not clear the field.
            defaultValue=""
          />
        </div>
      </Field>

      <Field label="Password" htmlFor="password" required error={fieldErrors?.password}>
        <div className="relative">
          <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-meta" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(fieldErrors?.password)}
            className="pl-9"
          />
        </div>
      </Field>

      <SubmitButton />

      <div className="rounded-md border border-surface-variant bg-surface-container-low p-4">
        <p className="text-label-md font-semibold text-ink">Demo credentials</p>
        <dl className="mt-2 space-y-1 text-body-sm text-meta">
          <div className="flex gap-2">
            <dt className="font-medium">Email</dt>
            <dd className="font-mono">admin@ieee-itb.ac.id</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Password</dt>
            <dd className="font-mono">Admin#2026!</dd>
          </div>
        </dl>
        <p className="mt-2 text-body-sm text-meta">
          Created by <code className="font-mono">npm run db:seed</code>.
        </p>
      </div>

      <Link
        href="/"
        className="flex items-center justify-center gap-1.5 text-label-md font-semibold text-primary transition-colors hover:text-on-primary-container"
      >
        <ArrowLeftIcon className="size-4" />
        Back to the public catalog
      </Link>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" full disabled={pending}>
      {pending ? <Spinner label="Signing in" /> : <LockIcon className="size-4" />}
      {pending ? "Signing in…" : "Sign in to dashboard"}
    </Button>
  );
}
