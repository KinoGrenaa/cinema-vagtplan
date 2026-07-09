import { getTemplateStaffingGapSummary } from "../../helpers/page/scheduleTemplateStaffingGaps";

type WeekParity = "ANY" | "EVEN" | "ODD";

type TemplateJobFunction = {
  id: number;
  requiredCount: number;
  assignments?: { userId?: number | null; user?: { id?: number | null } | null }[];
  jobFunction?: { name?: string | null } | null;
};

type TemplateDay = {
  weekday: number;
  isActive?: boolean;
  jobFunctions?: TemplateJobFunction[] | null;
};

type ScheduleTemplate = {
  id: number;
  name: string;
  weekParity: WeekParity;
  isActive: boolean;
  days?: TemplateDay[] | null;
};

type ScheduleTemplateListProps = {
  templates: ScheduleTemplate[];
  loading: boolean;
  showArchived: boolean;
  selectedTemplateId: number | null;
  onShowArchivedChange: (showArchived: boolean) => void;
  onSelectTemplate: (templateId: number) => void;
  onCreateTemplate: () => void;
};

function formatWeekParity(value: WeekParity) {
  if (value === "EVEN") return "Kun lige uger";
  if (value === "ODD") return "Kun ulige uger";
  return "Alle uger";
}

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

function getTemplateJobFunctionCount(template: ScheduleTemplate) {
  return (template.days ?? []).reduce(
    (sum, day) =>
      sum +
      (day.jobFunctions ?? []).reduce(
        (daySum, item) => daySum + item.requiredCount,
        0,
      ),
    0,
  );
}

export default function ScheduleTemplateList({
  templates,
  loading,
  showArchived,
  selectedTemplateId,
  onShowArchivedChange,
  onSelectTemplate,
  onCreateTemplate,
}: ScheduleTemplateListProps) {
  return (
    <aside className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch">
        <div>
          <h2 className="text-xl font-black">Vagtsskabeloner</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vælg en skabelon for at redigere ugedage og jobfunktioner.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateTemplate}
          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Opret vagtsskabelon
        </button>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => onShowArchivedChange(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Vis arkiverede
      </label>

      <div className="mt-4 flex flex-col gap-3">
        {loading && (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
            Henter vagtsskabeloner...
          </p>
        )}

        {!loading && templates.length === 0 && (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400">
            Der er endnu ingen vagtsskabeloner for den valgte biograf.
          </p>
        )}

        {templates.map((template) => {
          const selected = selectedTemplateId === template.id;
          const templateGapSummary = getTemplateStaffingGapSummary(template);

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              className={`w-full rounded-2xl border p-4 text-left transition ${
                selected
                  ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                  : "border-gray-200 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black">{template.name}</p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {formatWeekParity(template.weekParity)} ·{" "}
                    {template.days?.length ?? 0} ugedage ·{" "}
                    {getTemplateJobFunctionCount(template)} vagter
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    template.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200"
                      : "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}
                >
                  {template.isActive ? "Aktiv" : "Arkiveret"}
                </span>
              </div>

              <div className="mt-3">
                {templateGapSummary.missingShiftCount > 0 ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                    {formatOpenShiftText(templateGapSummary.missingShiftCount)}
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-800 dark:bg-green-950/50 dark:text-green-100">
                    Fast bemandet
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
