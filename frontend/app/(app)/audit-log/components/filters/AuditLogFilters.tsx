import type { Dispatch, SetStateAction } from "react";
import { getEntityTypeLabel } from "../../helpers/core/auditLogHelpers";

type AuditLogFiltersProps = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  entityFilter: string;
  setEntityFilter: Dispatch<SetStateAction<string>>;
  entityTypes: string[];
};

const fieldClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20";

export default function AuditLogFilters({
  search,
  setSearch,
  entityFilter,
  setEntityFilter,
  entityTypes,
}: AuditLogFiltersProps) {
  return (
    <section
      aria-label="Filtre til ændringshistorik"
      className="mb-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none md:grid-cols-[minmax(0,1fr)_240px] md:p-5"
    >
      <div>
        <label
          htmlFor="audit-log-search"
          className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Søg
        </label>
        <input
          id="audit-log-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Søg i handling, beskrivelse eller medarbejder..."
          className={fieldClassName}
        />
      </div>

      <div>
        <label
          htmlFor="audit-log-entity-filter"
          className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Type
        </label>
        <select
          id="audit-log-entity-filter"
          value={entityFilter}
          onChange={(event) => setEntityFilter(event.target.value)}
          className={fieldClassName}
        >
          <option value="ALL">Alle typer</option>
          {entityTypes.map((entityType) => (
            <option key={entityType} value={entityType}>
              {getEntityTypeLabel(entityType)}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
