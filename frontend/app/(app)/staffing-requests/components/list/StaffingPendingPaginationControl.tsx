type Props = {
  loadedCount:
    number;
  totalCount:
    number;
  hasMore:
    boolean;
  loadingMore:
    boolean;
  onLoadMore:
    () => Promise<unknown>;
};

export default function StaffingPendingPaginationControl({
  loadedCount,
  totalCount,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  if (
    totalCount === 0
  ) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Viser {loadedCount} af{" "}
        {totalCount} åbne
        bemandingsforespørgsler
      </p>

      {hasMore ? (
        <button
          type="button"
          onClick={() =>
            void onLoadMore()
          }
          disabled={
            loadingMore
          }
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-100 active:bg-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/45 dark:text-blue-200 dark:hover:bg-blue-950/70 dark:active:bg-blue-900 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
        >
          {loadingMore
            ? "Henter åbne forespørgsler..."
            : "Hent flere åbne"}
        </button>
      ) : (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Alle åbne forespørgsler er vist
        </span>
      )}
    </section>
  );
}
