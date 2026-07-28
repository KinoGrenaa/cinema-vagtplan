type StaffingHealth =
  | "UNKNOWN"
  | "STABLE"
  | "HIGH_PRESSURE"
  | "CRITICAL";

type OperationsHealth = {
  staffingHealth: StaffingHealth;
  activeShiftCount: number;
  highFatigueEmployees: number;
  moviePressure: number;
  movieDataAvailable: boolean;
};

type Props = {
  operationsHealth: OperationsHealth;
  operationalRecommendations: string[];
};

const staffingHealthLabels: Record<StaffingHealth, string> = {
  UNKNOWN: "Ukendt",
  STABLE: "Stabil",
  HIGH_PRESSURE: "Højt pres",
  CRITICAL: "Kritisk",
};

export default function AiOperationsCommandCenter({
  operationsHealth,
  operationalRecommendations,
}: Props) {
  return (
    <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm dark:border-cyan-900 dark:bg-cyan-950">
      <div className="mb-5 flex items-center gap-3">
        <div className="text-3xl" aria-hidden="true">🤖</div>
        <div>
          <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            AI-driftsanalyse
          </h2>
          <p className="text-sm text-cyan-600 dark:text-cyan-400">
            Automatisk vurdering af bemanding og publikumsbelastning.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Bemandingssituation
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {staffingHealthLabels[operationsHealth.staffingHealth]}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Vagter i dag
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.activeShiftCount}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Lange vagter
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.highFatigueEmployees}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Solgte billetter i programmet
          </div>
          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.movieDataAvailable
              ? operationsHealth.moviePressure
              : "Ukendt"}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-xl" aria-hidden="true">🧠</div>
          <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
            Anbefalinger
          </h3>
        </div>
        <div className="space-y-3">
          {operationalRecommendations.map((recommendation, index) => (
            <div
              key={index}
              className="rounded-xl border border-cyan-200 bg-white p-4 text-sm text-cyan-700 dark:border-cyan-900 dark:bg-gray-900 dark:text-cyan-300"
            >
              {recommendation}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
