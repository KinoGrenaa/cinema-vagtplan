import { formatDashboardCount } from "../../helpers/dashboardPresentation";
import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type StaffingHeatmapItem = {
  id: number;
  employee: string;
  jobFunction?: string;
  risk: string;
  hours: string;
};

type Props = {
  staffingHeatmap: StaffingHeatmapItem[];
  shiftsSourceStatus: DashboardSourceStatus;
};

const riskRank: Record<string, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function formatRisk(risk: string) {
  if (risk === "LOW") return "Under 8 timer";
  if (risk === "MEDIUM") return "8-10 timer";
  if (risk === "HIGH") return "Mindst 10 timer";
  return "Ukendt";
}

export default function AiStaffingHeatmap({
  staffingHeatmap,
  shiftsSourceStatus,
}: Props) {
  const sourceReadable = isDashboardSourceReadable(
    shiftsSourceStatus,
  );
  const sortedItems = sourceReadable
    ? [...staffingHeatmap].sort((a, b) => {
        const riskDifference =
          (riskRank[b.risk] ?? 0) - (riskRank[a.risk] ?? 0);
        if (riskDifference !== 0) return riskDifference;
        return Number.parseFloat(b.hours) - Number.parseFloat(a.hours);
      })
    : [];
  const mediumRiskCount = sourceReadable
    ? staffingHeatmap.filter((item) => item.risk === "MEDIUM").length
    : 0;
  const highRiskCount = sourceReadable
    ? staffingHeatmap.filter((item) => item.risk === "HIGH").length
    : 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold text-gray-950 dark:text-white">
              Vagtlængder og belastning
            </h3>
            {isDashboardSourceStale(shiftsSourceStatus) && (
              <DashboardSourceBadge status={shiftsSourceStatus} />
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
            Vagterne sorteres med de længste og mest belastende øverst.
          </p>
        </div>
        {sourceReadable ? (
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {formatDashboardCount(mediumRiskCount, "vagt", "vagter")} 8-10 t.
            </span>
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800 dark:bg-red-900 dark:text-red-200">
              {formatDashboardCount(highRiskCount, "vagt", "vagter")} 10+ t.
            </span>
          </div>
        ) : (
          <DashboardSourceBadge status={shiftsSourceStatus} />
        )}
      </div>

      {!sourceReadable ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Dagens vagter kunne ikke hentes. Vagtlængderne kan derfor ikke vurderes.
        </p>
      ) : sortedItems.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Der er ingen vagter i dagens vagtplan.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 ${
                item.risk === "LOW"
                  ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
                  : item.risk === "MEDIUM"
                    ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/40"
                    : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold">
                    {item.employee || "Ikke tildelt"}
                  </h4>
                  <p className="mt-1 text-sm opacity-80">
                    {item.jobFunction || "Jobfunktion ikke angivet"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    item.risk === "LOW"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : item.risk === "MEDIUM"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}
                >
                  {formatRisk(item.risk)}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold">
                Vagtlængde: {item.hours} timer
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
