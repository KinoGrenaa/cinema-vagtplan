type StaffingRequestsSummaryCardsProps = {
  emergencyCount: number;
  pendingCount: number;
  completedCount: number;
};

export default function StaffingRequestsSummaryCards({
  emergencyCount,
  pendingCount,
  completedCount,
}: StaffingRequestsSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Akutte</div>
        <div className="mt-2 text-3xl font-bold">{emergencyCount}</div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Afventer</div>
        <div className="mt-2 text-3xl font-bold">{pendingCount}</div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Behandlede
        </div>
        <div className="mt-2 text-3xl font-bold">{completedCount}</div>
      </div>
    </section>
  );
}
