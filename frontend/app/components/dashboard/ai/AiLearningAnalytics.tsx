type AiLearningAnalyticsData = {
  emergencyEvents: number;
  fatigueTrend: number;
  overtimeTrend: number;
  aiInterventions: number;
};

type Props = {
  aiLearningAnalytics: AiLearningAnalyticsData;
};

export default function AiLearningAnalytics({ aiLearningAnalytics }: Props) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-xl">📊</div>

        <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
          AI Learning Analytics
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Emergency events
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiLearningAnalytics.emergencyEvents}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Fatigue trend
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiLearningAnalytics.fatigueTrend}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Overtime trend
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiLearningAnalytics.overtimeTrend}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            AI interventions
          </div>

          <div className="mt-2 text-2xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiLearningAnalytics.aiInterventions}
          </div>
        </div>
      </div>
    </div>
  );
}
