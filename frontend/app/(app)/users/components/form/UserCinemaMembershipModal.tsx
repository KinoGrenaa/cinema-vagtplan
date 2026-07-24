"use client";

import type { User } from "../../helpers/core/userTypes";

export type UserCinemaOption = {
  id: number;
  name: string;
  logoUrl?: string | null;
};

type UserCinemaMembershipModalProps = {
  user: User | null;
  cinemas: UserCinemaOption[];
  selectedCinemaIds: number[];
  primaryCinemaId: number | null;
  defaultCinemaId: number | null;
  loading: boolean;
  saving: boolean;
  error: string;
  onToggleCinema: (cinemaId: number) => void;
  onChooseDefaultCinema: (cinemaId: number) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function UserCinemaMembershipModal({
  user,
  cinemas,
  selectedCinemaIds,
  defaultCinemaId,
  loading,
  saving,
  error,
  onToggleCinema,
  onChooseDefaultCinema,
  onClose,
  onSave,
}: UserCinemaMembershipModalProps) {
  if (!user) {
    return null;
  }

  const userName =
    `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <h2 className="text-xl font-bold">
            Biograftilknytninger
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {userName} · Bruger-ID {user.id}
          </p>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Vælg de biografer, brugeren må arbejde i.
            Ved flere biografer kan MASTER vælge, hvilken
            biograf der skal bruges som standard ved næste
            login.
          </p>

          {loading ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
              Henter biograftilknytninger...
            </div>
          ) : error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : (
            <>
              <div className="mt-4 space-y-3">
                {cinemas.map((cinema) => {
                  const isDefault =
                    cinema.id === defaultCinemaId;
                  const isSelected =
                    selectedCinemaIds.includes(cinema.id);
                  const showDefaultControls =
                    selectedCinemaIds.length > 1 &&
                    isSelected;

                  return (
                    <article
                      key={cinema.id}
                      className={`rounded-xl border p-4 ${
                        isSelected
                          ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={saving}
                            onChange={() =>
                              onToggleCinema(cinema.id)
                            }
                            className="h-5 w-5 rounded border-gray-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:accent-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">
                                {cinema.name}
                              </span>

                              {showDefaultControls &&
                                isDefault && (
                                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
                                    Standardbiograf
                                  </span>
                                )}
                            </div>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Biograf-ID {cinema.id}
                            </p>
                          </div>
                        </label>

                        {showDefaultControls &&
                          !isDefault && (
                            <button
                              type="button"
                              onClick={() =>
                                onChooseDefaultCinema(
                                  cinema.id,
                                )
                              }
                              disabled={saving}
                              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-700 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:active:bg-blue-950/60 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                            >
                              Gør til standard
                            </button>
                          )}
                      </div>
                    </article>
                  );
                })}

                {cinemas.length === 0 && (
                  <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                    Der er ingen biografer at vælge.
                  </div>
                )}
              </div>

              {selectedCinemaIds.length === 0 &&
                cinemas.length > 0 && (
                  <div
                    className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                    role="status"
                  >
                    Brugeren mister adgang til systemet,
                    men kontoen og biografspecifik historik
                    bevares efter de gældende slettefrister.
                  </div>
                )}
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-6 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={
              loading || saving || Boolean(error)
            }
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            {saving
              ? "Gemmer..."
              : "Gem tilknytninger"}
          </button>
        </div>
      </div>
    </div>
  );
}
