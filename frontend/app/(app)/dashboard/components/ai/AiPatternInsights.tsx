type AiPatternInsightsData = {
  busiestDay: string;
  busiestDayCount: number;
  busiestHour: string;
  busiestHourCount: number;
  highFatigueEmployees: number;
};

type Props = {
  aiPatternInsights: AiPatternInsightsData;
};

export default function AiPatternInsights({ aiPatternInsights }: Props) {
  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="text-xl">­ЪДа</div>

        <h3 className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
          AI Pattern Insights
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Travleste dag
          </div>

          <div className="mt-2 text-xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiPatternInsights.busiestDay}
          </div>

          <div className="mt-1 text-sm opacity-80">
            {aiPatternInsights.busiestDayCount} vagter
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            Peak-time
          </div>

          <div className="mt-2 text-xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiPatternInsights.busiestHour}:00
          </div>

          <div className="mt-1 text-sm opacity-80">
            {aiPatternInsights.busiestHourCount} vagter
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            High fatigue risk
          </div>

          <div className="mt-2 text-xl font-bold text-cyan-700 dark:text-cyan-300">
            {aiPatternInsights.highFatigueEmployees}
          </div>

          <div className="mt-1 text-sm opacity-80">medarbejdere</div>
        </div>

        <div className="rounded-2xl border border-cyan-200 bg-white p-5 dark:border-cyan-900 dark:bg-gray-900">
          <div className="text-sm text-cyan-600 dark:text-cyan-400">
            AI status
          </div>

          <div className="mt-2 text-xl font-bold text-cyan-700 dark:text-cyan-300">
            LEARNING
          </div>

          <div className="mt-1 text-sm opacity-80">
            Pattern recognition aktiv
          </div>
        </div>
      </div>
    </div>
  );
}
