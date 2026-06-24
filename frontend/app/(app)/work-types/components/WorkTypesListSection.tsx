import type { WorkType } from "../helpers/workTypeTypes";

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
    <section className="rounded-2xl bg-white p-6 text-gray-900 shadow dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold">Eksisterende vagttyper</h2>

        {isMaster && (
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => onShowArchivedChange(event.target.checked)}
              className="h-4 w-4"
              disabled={disabled}
            />
            Vis arkiverede typer
          </label>
        )}
      </div>

      {loading ? (
        <div className="text-gray-700 dark:text-gray-200">Indlæser...</div>
      ) : workTypes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Ingen vagttyper endnu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm dark:text-gray-100">
            <thead className="text-gray-500 dark:text-gray-400">
              <tr className="border-b">
                <th className="p-3">Farve</th>
                <th className="p-3">Navn</th>
                <th className="p-3">Løntype</th>
                <th className="p-3">Status</th>
                <th className="p-3">Handlinger</th>
              </tr>
            </thead>

            <tbody>
              {workTypes.map((workType) => (
                <tr
                  key={workType.id}
                  className={`border-b dark:border-gray-700 ${
                    workType.isActive
                      ? ""
                      : "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  <td className="p-3">
                    <div
                      className="h-6 w-6 rounded-full border"
                      style={{
                        backgroundColor: workType.color || "#2563eb",
                      }}
                    />
                  </td>

                  <td className="p-3 font-semibold">{workType.name}</td>

                  <td className="p-3">
                    {workType.payrollType
                      ? `${workType.payrollType.name} (${workType.payrollType.payrollCode})`
                      : "-"}
                  </td>

                  <td className="p-3">
                    {workType.isActive ? (
                      <span className="font-semibold text-green-600">Aktiv</span>
                    ) : (
                      <span className="font-semibold text-gray-500">Arkiveret</span>
                    )}
                  </td>

                  <td className="p-3">
                    {workType.isActive ? (
                      <button
                        onClick={() => onRemove(workType.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Arkivér
                      </button>
                    ) : (
                      <button
                        onClick={() => onReactivate(workType.id)}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700"
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
