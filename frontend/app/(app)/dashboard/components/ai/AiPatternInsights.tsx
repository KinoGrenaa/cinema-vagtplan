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

export default function AiPatternInsights({
  aiPatternInsights,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center gap-2">
        <div className="text-xl" aria-hidden="true">📈</div>
        <div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Mønstre i planlægningen
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            En enkel opsummering af de travleste tider og lange vagter.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Travleste dag
          </div>
          <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
            {aiPatternInsights.busiestDay}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {aiPatternInsights.busiestDayCount} vagter
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Travleste starttidspunkt
          </div>
          <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
            {aiPatternInsights.busiestHour === "Ingen data"
              ? "Ingen data"
              : `${aiPatternInsights.busiestHour}:00`}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {aiPatternInsights.busiestHourCount} vagter
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Vagter med høj belastningsrisiko
          </div>
          <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
            {aiPatternInsights.highFatigueEmployees}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Analysestatus
          </div>
          <div className="mt-2 text-xl font-bold text-gray-950 dark:text-white">
            Aktiv
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Mønstergenkendelse er aktiv
          </div>
        </div>
      </div>
    </section>
  );
}
