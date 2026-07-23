import type { TimeEntry } from "../../helpers/core/myTimeTypes";
import MyTimeEntryCard from "./MyTimeEntryCard";

type MyTimeDayGroup = {
  dayKey: string;
  label: string;
  summaryParts: string[];
  entries: TimeEntry[];
};

type MyTimeDayGroupsSectionProps = {
  loading: boolean;
  visibleEntryCount: number;
  dayGroups: MyTimeDayGroup[];
  expandedDayKeys: string[];
  onToggleDayGroup: (dayKey: string) => void;
  onEdit: (entry: TimeEntry) => void;
  onHistory: (entry: TimeEntry) => void;
};

function getSummaryPartClass(part: string) {
  const baseClass = "rounded-full border px-2.5 py-1 text-xs font-semibold";

  if (part.startsWith("Godkendt:")) {
    return `${baseClass} border-green-200 bg-green-50 text-green-800 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300`;
  }

  if (part.startsWith("Afventer:")) {
    return `${baseClass} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300`;
  }

  if (part.startsWith("Kræver handling:")) {
    return `${baseClass} border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200`;
  }

  if (part.startsWith("Afvist/annulleret:")) {
    return `${baseClass} border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`;
  }

  return `${baseClass} border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`;
}

export default function MyTimeDayGroupsSection({
  loading,
  visibleEntryCount,
  dayGroups,
  expandedDayKeys,
  onToggleDayGroup,
  onEdit,
  onHistory,
}: MyTimeDayGroupsSectionProps) {
  if (loading) {
    return (
      <section
        role="status"
        className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          Henter timer...
        </p>
      </section>
    );
  }

  if (visibleEntryCount === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-900 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-100">
        <h2 className="text-xl font-bold text-gray-950 dark:text-white">
          Ingen timer at vise
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          Der er ingen timer, der matcher det valgte filter i den aktuelle
          lønperiode.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Timeregistreringer" className="space-y-4">
      {dayGroups.map((group) => {
        const isExpanded = expandedDayKeys.includes(group.dayKey);
        const panelId = `my-time-day-${group.dayKey.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

        return (
          <article
            key={group.dayKey}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
          >
            <button
              type="button"
              onClick={() => onToggleDayGroup(group.dayKey)}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              className="flex w-full flex-col gap-3 bg-gray-50 p-5 text-left transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:bg-gray-950/50 dark:hover:bg-gray-800/70 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">
                  {group.label}
                </h2>
                {group.summaryParts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.summaryParts.map((part) => (
                      <span key={part} className={getSummaryPartClass(part)}>
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span className="w-fit rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                {isExpanded ? "Fold ind" : "Fold ud"}
              </span>
            </button>

            {isExpanded && (
              <div
                id={panelId}
                className="space-y-3 border-t border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-950/30"
              >
                {group.entries.map((entry) => (
                  <MyTimeEntryCard
                    key={entry.id}
                    entry={entry}
                    onEdit={onEdit}
                    onHistory={onHistory}
                  />
                ))}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
