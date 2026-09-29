"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEventAction } from "@/app/actions/events";
import { useToast } from "@/components/ui/toast";
import { TrashIcon } from "@/components/icons";

/**
 * Delete control with a confirmation dialog.
 *
 * Deletion is permanent — there is no undo and no soft-delete, so the dialog
 * restates the event title and warns about the consequence. The action itself
 * re-checks authorisation server-side, so a forged request is still rejected.
 */
export function DeleteEventButton({
  id,
  title,
  status,
  compact = false,
}: {
  id: string;
  title: string;
  status: string;
  /** Icon-only, for dense table rows. The label is still exposed to AT. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function confirm() {
    const formData = new FormData();
    formData.set("id", id);

    startTransition(async () => {
      try {
        await deleteEventAction(formData);
        // A successful delete redirects, so this only runs on failure.
        toast.error("Could not delete the event. Please try again.");
        setOpen(false);
      } catch {
        toast.error("Could not delete the event. Please try again.");
        setOpen(false);
      }
    });
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Delete ${title}`}
          title="Delete"
          className="inline-flex size-8 items-center justify-center rounded-md text-critical transition-colors hover:bg-critical-container"
        >
          <TrashIcon className="size-4" />
        </button>
      ) : (
        <Button variant="danger" onClick={() => setOpen(true)}>
          <TrashIcon className="size-4" />
          Delete
        </Button>
      )}

      <ConfirmDialog
        open={open}
        title="Delete this event?"
        description={`“${title}” will be permanently removed from the database. This cannot be undone.`}
        confirmLabel={pending ? "Deleting…" : "Delete permanently"}
        busy={pending}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      >
        <div className="rounded-md border border-surface-variant bg-surface-container-low p-3 text-body-sm text-meta">
          <p>The public catalog link for this event will stop working immediately.</p>
          {status === "PUBLISHED" && (
            <p className="mt-1.5 text-critical">
              This event is currently published and visible to visitors.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </>
  );
}
