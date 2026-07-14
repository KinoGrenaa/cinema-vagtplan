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
  loading: boolean;
  saving: boolean;
  error: string;
  onToggleCinema: (cinemaId: number) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function UserCinemaMembershipModal({
  user,
  cinemas,
  selectedCinemaIds,
  primaryCinemaId,
  loading,
  saving,
  error,
  onToggleCinema,
  onClose,
  onSave,
}: UserCinemaMembershipModalProps) {
  if (!user) {
    return null;
  }

  const userName = `${user.firstName} ${user.lastName}`.trim();

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
            Vælg de biografer, brugeren må skifte imellem.
            Hjemmebiografen kan ikke fjernes her.
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
            <div className="mt-4 space-y-3">
              {cinemas.map((cinema) => {
                const isPrimary = cinema.id === primaryCinemaId;
                const isSelected = selectedCinemaIds.includes(
                  cinema.id,
                );

                return (
                  <label
                    key={cinema.id}
                    className={`flex items-center gap-3 rounded-xl border p-4 ${
                      isPrimary
                        ? "border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30"
                        : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isPrimary || saving}
                      onChange={() => onToggleCinema(cinema.id)}
                      className="h-5 w-5 rounded border-gray-300"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {cinema.name}
                        </span>
                        {isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            Hjemmebiograf
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Biograf-ID {cinema.id}
                      </p>
                    </div>
                  </label>
                );
              })}

              {cinemas.length === 0 && (
                <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
                  Der er ingen biografer at vælge.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 p-6 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-300 px-4 py-2 font-semibold hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={
              loading ||
              saving ||
              Boolean(error) ||
              selectedCinemaIds.length === 0
            }
            className="rounded-xl bg-purple-700 px-4 py-2 font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Gemmer..." : "Gem tilknytninger"}
          </button>
        </div>
      </div>
    </div>
  );
}
