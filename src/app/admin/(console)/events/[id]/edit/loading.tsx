/** Streaming loading UI for the event editor. */
export default function EditEventLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mb-6 space-y-3">
        <div className="h-4 w-32 rounded bg-surface-container" />
        <div className="h-7 w-2/3 max-w-full rounded bg-surface-container" />
        <div className="h-4 w-56 rounded bg-surface-container" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-64 w-full rounded-lg border border-line bg-surface-container-lowest" />
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-52 w-full rounded-lg border border-line bg-surface-container-lowest" />
          ))}
        </div>
      </div>
    </div>
  );
}
