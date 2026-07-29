"use client";

type DashboardWorkspaceShareButtonProps = {
  copyState: "idle" | "copied" | "error";
  onCopy: () => void;
};

export default function DashboardWorkspaceShareButton({
  copyState,
  onCopy,
}: DashboardWorkspaceShareButtonProps) {
  const label =
    copyState === "copied"
      ? "Link kopieret"
      : copyState === "error"
        ? "Kunne ikke kopiere"
        : "Kopiér link til sektion";

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-live="polite"
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 dark:focus-visible:ring-blue-300 dark:focus-visible:ring-offset-gray-900"
    >
      {label}
    </button>
  );
}
