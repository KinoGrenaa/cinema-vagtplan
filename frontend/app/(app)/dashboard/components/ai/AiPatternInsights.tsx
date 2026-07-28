import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type AiPatternInsightsData = {
  busiestDay: string;
  busiestDayCount: number;
  busiestHour: string;
  busiestHourCount: number;
  highFatigueEmployees: number;
};

type Props = {
  aiPatternInsights: AiPatternInsightsData;
  shiftsSourceStatus: DashboardSourceStatus;
};

export default function AiPatternInsights({
  aiPatternInsights,
  shiftsSourceStatus,
}: Props) {
  const sourceReadable = isDashboardSourceReadable(
    shiftsSourceStatus,
  );
  const hasShiftData =
    sourceReadable && aiPatternInsights.busiestDayCount > 0;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Mønstre i dagens vagtplan
          </h3>
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Dagens vagter
          </span>
          {isDashboardSourceStale(shiftsSourceStatus) && (
            <DashboardSourceBadge status={shiftsSourceStatus} />
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
          En enkel optælling af dagens vagter og de hyppigste starttidspunkter.
        </p>
      </div>

      {!sourceReadable ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Dagens vagtplan kunne ikke hentes. Mønstrene kan derfor ikke beregnes.
        </p>
      ) : !hasShiftData ? (
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Der er ingen vagter i dagens vagtplan.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Dag i analysen
            </div>
            <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
              {aiPatternInsights.busiestDay}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {aiPatternInsights.busiestDayCount} vagter i alt
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Hyppigste starttime
            </div>
            <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
              {aiPatternInsights.busiestHour === "Ingen data"
                ? "Ingen data"
                : `Kl. ${aiPatternInsights.busiestHour}:00`}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {aiPatternInsights.busiestHourCount} vagter starter her
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Vagter på mindst 10 timer
            </div>
            <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
              {aiPatternInsights.highFatigueEmployees}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Dataperiode
            </div>
            <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
              I dag
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Ingen historiske vagter indgår
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
