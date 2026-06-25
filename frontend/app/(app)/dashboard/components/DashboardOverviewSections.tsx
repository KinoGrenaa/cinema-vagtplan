type DashboardOverviewSectionsProps = {
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  shiftCount: number;
};

export default function DashboardOverviewSections({
  movieCount,
  soldSeatsToday,
  seatLoadPercent,
  shiftCount,
}: DashboardOverviewSectionsProps) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-bold">Biograf i dag</h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              Forestillinger
            </span>
            <span className="font-medium">{movieCount}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">
              Solgte billetter
            </span>
            <span className="font-medium">{soldSeatsToday}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Belægning</span>
            <span className="font-medium">{seatLoadPercent}%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Vagter i dag</span>
            <span className="font-medium">{shiftCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-bold">Genveje</h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href="/schedule"
            className="rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700"
          >
            Vagtplan
          </a>

          <a
            href="/time-entries"
            className="rounded-xl bg-green-600 px-4 py-3 text-center font-medium text-white hover:bg-green-700"
          >
            Tidsregistrering
          </a>

          <a
            href="/shift-trades"
            className="rounded-xl bg-purple-600 px-4 py-3 text-center font-medium text-white hover:bg-purple-700"
          >
            Vagtbytte
          </a>

          <a
            href="/payroll"
            className="rounded-xl bg-gray-800 px-4 py-3 text-center font-medium text-white hover:bg-gray-900"
          >
            Payroll
          </a>
        </div>
      </div>
    </section>
  );
}
