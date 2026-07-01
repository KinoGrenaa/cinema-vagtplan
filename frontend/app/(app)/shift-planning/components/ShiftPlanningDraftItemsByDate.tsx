type SavedDraftItem = {
  id: number | string;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  scheduleTemplateName?: string | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userEmail?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  warningMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DraftDateGroup = {
  dateKey: string;
  label: string;
  items: SavedDraftItem[];
  unassignedCount: number;
  warningCount: number;
  missingTimeCount: number;
};

type ShiftPlanningDraftItemsByDateProps = {
  dateGroups: DraftDateGroup[];
};

const MAX_VISIBLE_DATE_GROUPS = 10;
const MAX_VISIBLE_ITEMS_PER_DAY = 6;

function formatMinute(value: unknown) {
  const minute = Number(value);

  if (!Number.isInteger(minute) || minute < 0) {
    return null;
  }

  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatTimeRange(item: SavedDraftItem) {
  const start = formatMinute(item.plannedStartMinute);
  const end = formatMinute(item.plannedEndMinute);

  if (!start || !end) {
    return "Tid mangler";
  }

  return `kl. ${start} - ${end}`;
}

function formatUserName(item: SavedDraftItem) {
  const name = `${item.userFirstName ?? ""} ${item.userLastName ?? ""}`.trim();

  return name || item.userEmail || "Ikke tildelt";
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getItemJobFunctionName(item: SavedDraftItem) {
  return (
    item.jobFunctionName ||
    getMetadataString(item.metadata, "jobFunctionName") ||
    "Jobfunktion mangler"
  );
}

function getItemTemplateName(item: SavedDraftItem) {
  return (
    item.scheduleTemplateName ||
    getMetadataString(item.metadata, "scheduleTemplateName") ||
    "Skabelon mangler"
  );
}

export function ShiftPlanningDraftItemsByDate({
  dateGroups,
}: ShiftPlanningDraftItemsByDateProps) {
  const visibleDateGroups = dateGroups.slice(0, MAX_VISIBLE_DATE_GROUPS);
  const hiddenDateGroupCount = Math.max(
    0,
    dateGroups.length - visibleDateGroups.length,
  );

  if (dateGroups.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Kladden har ingen poster.
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 grid gap-4">
        {visibleDateGroups.map((group) => {
          const visibleItemsForDay = group.items.slice(
            0,
            MAX_VISIBLE_ITEMS_PER_DAY,
          );
          const hiddenItemsForDay = Math.max(
            0,
            group.items.length - visibleItemsForDay.length,
          );

          return (
            <section
              key={group.dateKey || group.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-base font-bold text-gray-950 dark:text-white">
                    {group.label}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {group.items.length} poster på datoen
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  {group.unassignedCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                      {group.unassignedCount} ikke tildelt
                    </span>
                  )}
                  {group.warningCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100">
                      {group.warningCount} advarsler
                    </span>
                  )}
                  {group.missingTimeCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-950 dark:bg-red-950/60 dark:text-red-100">
                      {group.missingTimeCount} uden tid
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {visibleItemsForDay.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-950 dark:text-white">
                          {formatTimeRange(item)}
                        </p>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                          {item.jobFunctionColor && (
                            <span
                              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: item.jobFunctionColor,
                              }}
                            />
                          )}
                          {getItemJobFunctionName(item)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {getItemTemplateName(item)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 lg:text-right">
                        Medarbejder: {formatUserName(item)}
                      </div>
                    </div>

                    {item.warningMessage && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                        Advarsel: {item.warningMessage}
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {hiddenItemsForDay > 0 && (
                <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  {hiddenItemsForDay} flere poster på datoen er skjult.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {hiddenDateGroupCount > 0 && (
        <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
          {hiddenDateGroupCount} flere datoer er skjult i denne kompakte
          kontrolvisning.
        </p>
      )}
    </>
  );
}
