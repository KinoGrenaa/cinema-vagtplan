import {
  formatDateDK,
} from "../../helpers/core/masterHelpers";
import type {
  Cinema,
} from "../../helpers/core/masterTypes";

type MasterCinemasListSectionProps = {
  cinemas: Cinema[];
  selectedCinemaId: number | null;
  editingCinemaId: number | null;
  editingCinemaName: string;
  savingCinemaId: number | null;
  onEditingCinemaNameChange: (
    value: string,
  ) => void;
  onSaveSelectedCinema: (
    cinema: Cinema,
  ) => void;
  onStartEditingCinema: (
    cinema: Cinema,
  ) => void;
  onCancelEditingCinema: () => void;
  onSaveCinemaName: (
    cinema: Cinema,
  ) => void;
  onManageModules: (
    cinema: Cinema,
  ) => void;
};

export default function MasterCinemasListSection({
  cinemas,
  selectedCinemaId,
  editingCinemaId,
  editingCinemaName,
  savingCinemaId,
  onEditingCinemaNameChange,
  onSaveSelectedCinema,
  onStartEditingCinema,
  onCancelEditingCinema,
  onSaveCinemaName,
  onManageModules,
}: MasterCinemasListSectionProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-6 dark:border-gray-800">
        <h2 className="text-xl font-bold">
          Biografer
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Vælg hvilken biograf
          MASTER-panelet skal arbejde
          videre med, eller administrer
          dens moduler.
        </p>
      </div>

      {cinemas.length === 0 ? (
        <div className="p-6 text-sm text-gray-600 dark:text-gray-400">
          Der er ingen biografer endnu.
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {cinemas.map((cinema) => {
            const isSelected =
              selectedCinemaId ===
              cinema.id;
            const isEditing =
              editingCinemaId ===
              cinema.id;
            const activeUserCount =
              cinema.activeUserCount ??
              0;
            const totalUserCount =
              cinema._count?.users ??
              0;
            const inactiveUserCount =
              cinema.inactiveUserCount ??
              Math.max(
                0,
                totalUserCount -
                  activeUserCount,
              );

            return (
              <div
                key={cinema.id}
                className={`p-6 ${
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/20"
                    : "bg-white dark:bg-gray-900"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex flex-col gap-3 md:flex-row">
                        <input
                          value={
                            editingCinemaName
                          }
                          onChange={(
                            event,
                          ) =>
                            onEditingCinemaNameChange(
                              event.target
                                .value,
                            )
                          }
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onSaveCinemaName(
                              cinema,
                            )
                          }
                          disabled={
                            savingCinemaId ===
                            cinema.id
                          }
                          className="rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                        >
                          Gem
                        </button>
                        <button
                          type="button"
                          onClick={
                            onCancelEditingCinema
                          }
                          disabled={
                            savingCinemaId ===
                            cinema.id
                          }
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
                        >
                          Annuller
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {cinema.name}
                          </h3>
                          {isSelected && (
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                              Valgt
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
                            Aktive brugere:{" "}
                            {
                              activeUserCount
                            }
                          </span>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                            Deaktiverede:{" "}
                            {
                              inactiveUserCount
                            }
                          </span>
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                            Brugere i alt:{" "}
                            {totalUserCount}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            ID: {cinema.id}
                          </span>
                          <span>
                            Oprettet:{" "}
                            {formatDateDK(
                              cinema.createdAt,
                            )}
                          </span>
                          <span>
                            Vagter:{" "}
                            {cinema._count
                              ?.shifts ??
                              0}
                          </span>
                          <span>
                            Jobfunktioner:{" "}
                            {cinema._count
                              ?.workTypes ??
                              0}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveSelectedCinema(
                            cinema,
                          )
                        }
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 ${
                          isSelected
                            ? "bg-blue-700 text-white hover:bg-blue-800 active:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400"
                            : "border border-blue-300 bg-white text-blue-800 hover:bg-blue-50 active:bg-blue-100 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:active:bg-blue-950/70"
                        }`}
                      >
                        {isSelected
                          ? "Valgt"
                          : "Vælg"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onManageModules(
                            cinema,
                          )
                        }
                        className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 transition hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-blue-800 dark:bg-gray-950 dark:text-blue-200 dark:hover:bg-blue-950/40 dark:active:bg-blue-950/70 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
                      >
                        Moduler
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onStartEditingCinema(
                            cinema,
                          )
                        }
                        className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
                      >
                        Rediger navn
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
