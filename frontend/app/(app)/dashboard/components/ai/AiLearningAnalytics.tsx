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
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Datagrundlag og udløste regler
          </h3>
          <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            Kun i dag
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
          Tællerne viser de konkrete forhold i dagens data, som kan udløse advarsler og anbefalinger.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Forestillinger med mindst 200 solgte billetter
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
            Udløste advarsler og vurderinger
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            {aiLearningAnalytics.aiInterventions}
          </div>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Dette er et øjebliksbillede af dagens data. Kortet viser ikke historisk læring eller udvikling over tid.
      </p>
    </section>
  );
}
