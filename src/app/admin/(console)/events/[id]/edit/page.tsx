import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { DeleteEventButton } from "@/components/admin/delete-event-button";
import { updateEventAction } from "@/app/actions/events";
import { getEventById } from "@/lib/services/event-service";
import { Badge } from "@/components/ui/badge";
import { EventCover } from "@/components/ui/cover";
import { ArrowLeftIcon, CalendarIcon, ExternalLinkIcon } from "@/components/icons";
import { formatDateLong } from "@/lib/format";
import { toEditableEvent } from "@/lib/validation/event";
import { STATUS_META, type EventStatus } from "@/lib/constants";

export const metadata: Metadata = { title: "Edit event" };

type Params = { params: Promise<{ id: string }> };

/**
 * Edit page.
 *
 * Loads with `scope: "admin"` so drafts, archived and cancelled events are all
 * reachable — a hidden event must still be editable by the people who manage it.
 */
export default async function EditEventPage({ params }: Params) {
  const { id } = await params;
  const record = await getEventById(id, "admin");

  if (!record) notFound();

  // Re-validate the stored row through the form schema. A record that no longer
  // satisfies the current rules (e.g. seeded before a rule was tightened) is
  // reported rather than silently coerced into an invalid edit form.
  const event = toEditableEvent(record);
  if (!event) {
    throw new Error(
      `Event ${id} contains values that no longer satisfy the event schema and cannot be edited here.`,
    );
  }

  const status = STATUS_META[record.status as EventStatus];

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

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display-sm text-ink">{event.title}</h1>
              <Badge tone={status?.tone ?? "neutral"} dot>
                {status?.label ?? event.status}
              </Badge>
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-meta">
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="size-4" />
                {formatDateLong(event.startDate)}
              </span>
              <span>Last updated {formatDateLong(record.updatedAt)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {event.status === "PUBLISHED" || event.status === "SOLD_OUT" ? (
              <Link
                href={`/events/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line bg-surface-container-lowest px-4 text-label-md font-semibold text-ink transition-colors hover:border-line-strong"
              >
                View public page
                <ExternalLinkIcon className="size-4" />
              </Link>
            ) : null}
            <DeleteEventButton
              id={event.id}
              title={event.title}
              status={event.status}
            />
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-line bg-surface-container-lowest p-3">
        <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-md sm:block">
          <EventCover
            slug={event.slug}
            title={event.title}
            category={event.category}
            imageUrl={event.imageUrl}
            sizes="64px"
          />
        </div>
        <p className="text-body-sm text-meta">
          Permalink:{" "}
          <code className="font-mono text-ink">/events/{event.slug}</code> — the slug stays fixed so
          existing links keep working after a rename.
        </p>
      </div>

      <EventForm action={updateEventAction} submitLabel="Save changes" event={event} />
    </div>
  );
}
