type AiLearningAnalyticsData = {
  emergencyEvents: number;
  fatigueTrend: number;
  overtimeTrend: number;
  aiInterventions: number;
};

type Props = {
  aiLearningAnalytics: AiLearningAnalyticsData;
};

export default function AiLearningAnalytics({
  aiLearningAnalytics,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="text-xl" aria-hidden="true">📊</div>
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Analysegrundlag
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            De forhold, som dagens automatiske vurderinger bygger på.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Forestillinger med høj belastning
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {aiLearningAnalytics.emergencyEvents}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Vagter på mindst 8 timer
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {aiLearningAnalytics.fatigueTrend}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Vagter på mindst 10 timer
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {aiLearningAnalytics.overtimeTrend}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Genererede advarsler og anbefalinger
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {aiLearningAnalytics.aiInterventions}
          </div>
        </div>
      </div>
    </section>
  );
}
