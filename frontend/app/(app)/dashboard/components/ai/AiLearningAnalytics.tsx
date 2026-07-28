import {
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type { DashboardSourceStatus } from "../../types";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type AiLearningAnalyticsData = {
  emergencyEvents: number;
  fatigueTrend: number;
  overtimeTrend: number;
  aiInterventions: number;
};

type Props = {
  aiLearningAnalytics: AiLearningAnalyticsData;
  shiftsSourceStatus: DashboardSourceStatus;
  moviesSourceStatus: DashboardSourceStatus;
};

type RuleMetricProps = {
  label: string;
  value: number;
  status: DashboardSourceStatus;
};

function RuleMetric({ label, value, status }: RuleMetricProps) {
  const readable = isDashboardSourceReadable(status);

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {label}
        </div>
        <DashboardSourceBadge status={status} hideWhenFresh />
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
        {readable ? value : "—"}
      </div>
    </div>
  );
}

export default function AiLearningAnalytics({
  aiLearningAnalytics,
  shiftsSourceStatus,
  moviesSourceStatus,
}: Props) {
  const allInputsReadable =
    isDashboardSourceReadable(shiftsSourceStatus) &&
    isDashboardSourceReadable(moviesSourceStatus);
  const combinedStatus: DashboardSourceStatus = !allInputsReadable
    ? { state: "unavailable" }
    : isDashboardSourceStale(shiftsSourceStatus) ||
        isDashboardSourceStale(moviesSourceStatus)
      ? { state: "stale" }
      : { state: "fresh" };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Datagrundlag og udløste regler
          </h3>
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Kun i dag
          </span>
          {combinedStatus.state === "stale" && (
            <DashboardSourceBadge status={combinedStatus} />
          )}
        </div>
        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Tællerne viser de konkrete forhold i dagens data, som kan udløse advarsler og anbefalinger.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <RuleMetric
          label="Forestillinger med mindst 200 solgte billetter"
          value={aiLearningAnalytics.emergencyEvents}
          status={moviesSourceStatus}
        />
        <RuleMetric
          label="Vagter på mindst 8 timer"
          value={aiLearningAnalytics.fatigueTrend}
          status={shiftsSourceStatus}
        />
        <RuleMetric
          label="Vagter på mindst 10 timer"
          value={aiLearningAnalytics.overtimeTrend}
          status={shiftsSourceStatus}
        />
        <RuleMetric
          label="Udløste advarsler og vurderinger"
          value={aiLearningAnalytics.aiInterventions}
          status={combinedStatus}
        />
      </div>
      <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Dette er et øjebliksbillede af dagens data. Kortet viser ikke historisk læring eller udvikling over tid.
      </p>
    </section>
  );
}
