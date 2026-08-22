"use client";

type LeaveApprovalSuccessToastProps = {
  message:
    string | null;
  onDismiss:
    () => void;
};

export default function LeaveApprovalSuccessToast({
  message,
  onDismiss,
}: LeaveApprovalSuccessToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[80] w-[calc(100%-2rem)] max-w-sm"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white p-4 text-emerald-950 shadow-xl dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-100">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
        >
          ✓
        </span>

        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Status opdateret
          </p>
          <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100/90">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={
            onDismiss
          }
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950"
          aria-label="Luk besked"
        >
          ×
        </button>
      </div>
    </div>
  );
}
