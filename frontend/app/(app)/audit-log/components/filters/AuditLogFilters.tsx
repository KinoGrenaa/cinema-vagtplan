import type { Dispatch, SetStateAction } from "react";
import { getEntityTypeLabel } from "../../helpers/auditLogHelpers";

type AuditLogFiltersProps = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  entityFilter: string;
  setEntityFilter: Dispatch<SetStateAction<string>>;
  entityTypes: string[];
};

export default function AuditLogFilters({
  search,
  setSearch,
  entityFilter,
  setEntityFilter,
  entityTypes,
}: AuditLogFiltersProps) {
  return (
    <div className="mb-4 grid gap-3 rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800 md:grid-cols-[1fr_240px]">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Søg
        </label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Søg i handling, beskrivelse eller medarbejder..."
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Type
        </label>
        <select
          value={entityFilter}
          onChange={(event) => setEntityFilter(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        >
          <option value="ALL">Alle typer</option>
          {entityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>
              {getEntityTypeLabel(entityType)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
