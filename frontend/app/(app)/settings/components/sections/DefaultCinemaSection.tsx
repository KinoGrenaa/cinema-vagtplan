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
    options !== null &&
    selectedCinemaId !== options.defaultCinemaId;
  const selectionIsValid =
    options?.allowNoDefault || selectedCinemaId !== null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xl font-bold">Standardbiograf</h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Standardbiografen vælges automatisk ved dit næste
        login. Den aktive biograf i den nuværende session
        ændres ikke.
      </p>

      {loading ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
          Henter mulige standardbiografer...
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      ) : !options ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
          Standardbiografen kunne ikke vises.
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-sm font-medium">
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
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              >
                {options.allowNoDefault && (
                  <option value="">Ingen standard</option>
                )}

                {options.cinemas.map((cinema) => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name}
                    {cinema.isHomeCinema
                      ? " · Hjemmebiograf"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onSave}
              disabled={
                saving ||
                !hasChanged ||
                !selectionIsValid ||
                options.cinemas.length === 0
              }
              className="rounded-xl bg-purple-700 px-4 py-2 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Gemmer..." : "Gem standard"}
            </button>
          </div>

          {options.role === "MASTER" ? (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Vælger du <strong>Ingen standard</strong>, starter
              næste login uden aktiv biograf. Du vælger derefter
              biograf i MASTER-panelet.
            </p>
          ) : (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Du kan kun vælge blandt dine aktive
              biograftilknytninger. Din hjemmebiograf ændres ikke.
            </p>
          )}

          {message && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
              {message}
            </div>
          )}
        </>
      )}
    </section>
  );
}
