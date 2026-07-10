import MyTimeEntryCard from "./MyTimeEntryCard";

import type { TimeEntry } from "../../helpers/core/myTimeTypes";

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
  let className = "rounded-full px-2 py-1 text-xs font-medium";

  if (part.startsWith("Godkendt:")) {
    className += " bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  } else if (part.startsWith("Afventer:")) {
    className += " bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  } else if (part.startsWith("Kræver handling:")) {
    className += " bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  } else if (part.startsWith("Afvist/annulleret:")) {
    className += " bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }

  return className;
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Henter timer...
      </div>
    );
  }

  if (visibleEntryCount === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Der er ingen timer, der matcher det valgte filter i den aktuelle
        lønperiode.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dayGroups.map((group) => {
        const isExpanded = expandedDayKeys.includes(group.dayKey);

        return (
          <section
            key={group.dayKey}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <button
              type="button"
              onClick={() => onToggleDayGroup(group.dayKey)}
              className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <h2 className="text-lg font-semibold">{group.label}</h2>

                {group.summaryParts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.summaryParts.map((part) => (
                      <span key={part} className={getSummaryPartClass(part)}>
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <span className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm font-medium dark:border-gray-700">
                {isExpanded ? "Fold ind" : "Fold ud"}
              </span>
            </button>

            {isExpanded && (
              <div className="space-y-3 border-t border-gray-200 p-4 dark:border-gray-800">
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
          </section>
        );
      })}
    </div>
  );
}
