type ScheduleTemplateSummaryCardsProps = {
  totalCount: number;
  activeCount: number;
  archivedCount: number;
  openShiftCount: number;
};

function formatOpenShiftText(openShiftCount: number) {
  if (openShiftCount === 1) return "1 åben vagt";
  return `${openShiftCount} åbne vagter`;
}

export default function ScheduleTemplateSummaryCards({
  totalCount,
  activeCount,
  archivedCount,
  openShiftCount,
}: ScheduleTemplateSummaryCardsProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          Vist
        </p>
        <p className="mt-2 text-3xl font-black">{totalCount}</p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          Aktive
        </p>
        <p className="mt-2 text-3xl font-black">{activeCount}</p>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
          Arkiverede
        </p>
        <p className="mt-2 text-3xl font-black">{archivedCount}</p>
      </div>
      <div
        className={`rounded-3xl border p-5 ${
          openShiftCount > 0
            ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            : "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950/30 dark:text-green-100"
        }`}
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em]">
          Åbne vagter
        </p>
        <p className="mt-2 text-3xl font-black">{openShiftCount}</p>
        <p className="mt-1 text-xs font-semibold">
          {openShiftCount > 0
            ? `${formatOpenShiftText(openShiftCount)} oprettes uden fast medarbejder`
            : "alle viste skabeloner er fast bemandet"}
        </p>
      </div>
    </section>
  );
}
