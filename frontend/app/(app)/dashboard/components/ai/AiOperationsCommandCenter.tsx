type StaffingHealth = "STABLE" | "HIGH_PRESSURE" | "CRITICAL";

type OperationsHealth = {
  staffingHealth: StaffingHealth;
  activeShiftCount: number;
  highFatigueEmployees: number;
  moviePressure: number;
};

type Props = {
  operationsHealth: OperationsHealth;
  operationalRecommendations: string[];
};

export default function AiOperationsCommandCenter({
  operationsHealth,
  operationalRecommendations,
}: Props) {
  return (
    <section className="mb-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-6 shadow-sm dark:border-cyan-900 dark:bg-cyan-950">
      <div className="mb-5 flex items-center gap-3">
        <div className="text-3xl">🤖</div>

        <div>
          <h2 className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            AI Operations Command Center
          </h2>

          <p className="text-sm text-cyan-600 dark:text-cyan-400">
            Realtidsanalyse af biografens samlede driftstilstand.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Staffing health
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.staffingHealth}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Active shifts
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.activeShiftCount}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            High fatigue employees
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.highFatigueEmployees}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Live movie pressure
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {operationsHealth.moviePressure}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-xl">🧠</div>

          <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
            AI Operational Recommendations
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
