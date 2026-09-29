import type { Metadata } from "next";
import Link from "next/link";
import { EventForm } from "@/components/admin/event-form";
import { createEventAction } from "@/app/actions/events";
import { ArrowLeftIcon } from "@/components/icons";

/**
 * Create-event page.
 *
 * No Suspense boundary is needed: the form is driven by `useActionState`, and
 * the action returns state rather than redirecting, so nothing here can suspend
 * the shell.
 */
export const metadata: Metadata = { title: "Create event" };

export default function NewEventPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6">
        <Link
          href="/admin/events"
          className="inline-flex items-center gap-1.5 text-label-md font-semibold text-primary transition-colors hover:text-on-primary-container"
        >
          <ArrowLeftIcon className="size-4" />
          Back to events
        </Link>
        <h1 className="mt-3 font-display-sm text-ink">Create event</h1>
        <p className="mt-1 text-body-md text-meta">
          Status defaults to <strong>Draft</strong>, so a new event stays off the public catalog until
          you set it to Published.
        </p>
      </header>

      <EventForm action={createEventAction} submitLabel="Create event" />
    </div>
  );
}
