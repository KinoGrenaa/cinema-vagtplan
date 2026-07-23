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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition-colors sm:p-6 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Eksisterende vagttyper</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Se aktive vagttyper og administrer arkiverede typer.
          </p>
        </div>

        {isMaster && (
          <label className="inline-flex w-fit items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-slate-700 transition-colors focus-within:ring-2 focus-within:ring-blue-600/30 dark:text-slate-200 dark:focus-within:ring-blue-400/40">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:accent-blue-400"
              disabled={disabled}
            />
            Vis arkiverede typer
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"
          />
          Indlæser...
        </div>
      ) : workTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-950/60">
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            Ingen vagttyper endnu
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Opret den første vagttype i formularen ovenfor.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm text-slate-900 dark:text-slate-100">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-950/70 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="p-3">Farve</th>
                  <th className="p-3">Navn</th>
                  <th className="p-3">Løntype</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {workTypes.map((workType) => (
                  <tr
                    key={workType.id}
                    className={`transition-colors ${
                      workType.isActive
                        ? "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/70"
                        : "bg-slate-50/80 text-slate-500 hover:bg-slate-100 dark:bg-slate-950/45 dark:text-slate-400 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <td className="p-3">
                      <div
                        aria-label={`Farve for ${workType.name}`}
                        className="h-7 w-7 rounded-full border border-white shadow-sm ring-1 ring-slate-300 dark:border-slate-900 dark:ring-slate-600"
                        role="img"
                        style={{ backgroundColor: workType.color || "#2563eb" }}
                      />
                    </td>
                    <td className="p-3 font-semibold text-slate-950 dark:text-slate-100">
                      {workType.name}
                    </td>
                    <td className="p-3">
                      {workType.payrollType
                        ? `${workType.payrollType.name} (${workType.payrollType.payrollCode})`
                        : "-"}
                    </td>
                    <td className="p-3">
                      {workType.isActive ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-950/60 dark:text-green-300">
                          Aktiv
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Arkiveret
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {workType.isActive ? (
                        <button
                          type="button"
                          onClick={() => onRemove(workType.id)}
                          className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-slate-900"
                        >
                          Arkivér
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onReactivate(workType.id)}
                          className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-slate-900"
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
        </div>
      )}
    </section>
  );
}
