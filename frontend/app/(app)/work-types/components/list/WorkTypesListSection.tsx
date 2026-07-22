import type { WorkType } from "../../helpers/core/workTypeTypes";

type WorkTypesListSectionProps = {
  workTypes: WorkType[];
  loading: boolean;
  isMaster: boolean;
  showArchived: boolean;
  disabled: boolean;
  onShowArchivedChange: (showArchived: boolean) => void;
  onRemove: (id: number) => void;
  onReactivate: (id: number) => void;
};

export default function WorkTypesListSection({
  workTypes,
  loading,
  isMaster,
  showArchived,
  disabled,
  onShowArchivedChange,
  onRemove,
  onReactivate,
}: WorkTypesListSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">
          Eksisterende vagttyper
        </h2>

        {isMaster && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) =>
                onShowArchivedChange(
                  event.target.checked,
                )
              }
              className="h-4 w-4 rounded border-gray-300 accent-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:accent-white dark:focus-visible:ring-white/40"
              disabled={disabled}
            />
            Vis arkiverede typer
          </label>
        )}
      </div>

      {loading ? (
        <div className="rounded-xl bg-gray-50 p-4 text-gray-700 dark:bg-gray-950/40 dark:text-gray-200">
          Indlæser...
        </div>
      ) : workTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
          Ingen vagttyper endnu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm text-gray-900 dark:text-gray-100">
            <thead className="text-gray-600 dark:text-gray-400">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="p-3">Farve</th>
                <th className="p-3">Navn</th>
                <th className="p-3">Løntype</th>
                <th className="p-3">Status</th>
                <th className="p-3">
                  Handlinger
                </th>
              </tr>
            </thead>

            <tbody>
              {workTypes.map((workType) => (
                <tr
                  key={workType.id}
                  className={`border-b border-gray-200 transition-colors last:border-b-0 dark:border-gray-700 ${
                    workType.isActive
                      ? "hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <td className="p-3">
                    <div
                      className="h-6 w-6 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{
                        backgroundColor:
                          workType.color ||
                          "#2563eb",
                      }}
                    />
                  </td>

                  <td className="p-3 font-semibold">
                    {workType.name}
                  </td>

                  <td className="p-3">
                    {workType.payrollType
                      ? `${workType.payrollType.name} (${workType.payrollType.payrollCode})`
                      : "-"}
                  </td>

                  <td className="p-3">
                    {workType.isActive ? (
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        Aktiv
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-600 dark:text-gray-400">
                        Arkiveret
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {workType.isActive ? (
                      <button
                        type="button"
                        onClick={() =>
                          onRemove(workType.id)
                        }
                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900"
                      >
                        Arkivér
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onReactivate(
                            workType.id,
                          )
                        }
                        className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-gray-900"
                      >
                        Genaktivér
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
