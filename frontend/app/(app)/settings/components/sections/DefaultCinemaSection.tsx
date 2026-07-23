"use client";

import type { DefaultCinemaOptions } from "../../hooks/useSettingsPage";

type DefaultCinemaSectionProps = {
  options: DefaultCinemaOptions | null;
  selectedCinemaId: number | null;
  loading: boolean;
  saving: boolean;
  error: string;
  message: string;
  onSelectedCinemaIdChange: (cinemaId: number | null) => void;
  onSave: () => void;
};

export default function DefaultCinemaSection({
  options,
  selectedCinemaId,
  loading,
  saving,
  error,
  message,
  onSelectedCinemaIdChange,
  onSave,
}: DefaultCinemaSectionProps) {
  const hasChanged =
    options !== null && selectedCinemaId !== options.defaultCinemaId;
  const selectionIsValid =
    Boolean(options?.allowNoDefault) || selectedCinemaId !== null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-2xl font-bold">Standardbiograf</h2>

      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-slate-300">
        Standardbiografen vælges automatisk ved dit næste login. Den
        aktive biograf i den nuværende session ændres ikke.
      </p>

      {loading ? (
        <div
          className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          role="status"
        >
          Henter mulige standardbiografer...
        </div>
      ) : error ? (
        <div
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : !options ? (
        <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
          Standardbiografen kunne ikke vises.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-2 block text-sm font-semibold">
                Vælg standard
              </span>

              <select
                value={selectedCinemaId ?? ""}
                onChange={(event) =>
                  onSelectedCinemaIdChange(
                    event.target.value
                      ? Number(event.target.value)
                      : null,
                  )
                }
                disabled={saving}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
              >
                {options.allowNoDefault && (
                  <option value="">Ingen standard</option>
                )}

                {options.cinemas.map((cinema) => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}
                    {cinema.isHomeCinema ? " · Hjemmebiograf" : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onSave}
              disabled={
                saving || !hasChanged || !selectionIsValid
              }
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/35 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Gemmer..." : "Gem standard"}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
            {options.role === "MASTER"
              ? "Vælger du Ingen standard, starter næste login uden aktiv biograf. Du vælger derefter biograf i MASTER-panelet."
              : "Du kan kun vælge blandt dine aktive biograftilknytninger. Din hjemmebiograf ændres ikke."}
          </div>

          {message && (
            <div
              className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          )}
        </>
      )}
    </section>
  );
}
