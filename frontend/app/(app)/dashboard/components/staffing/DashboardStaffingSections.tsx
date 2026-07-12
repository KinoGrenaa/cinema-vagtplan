type DashboardStaffingSectionsProps = {
  staffingWarnings: string[];
  predictiveStaffing: string[];
};

export default function DashboardStaffingSections({
  staffingWarnings,
  predictiveStaffing,
}: DashboardStaffingSectionsProps) {
  return (
    <>
      {staffingWarnings.length > 0 && (
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-orange-900 dark:bg-orange-950">
          <div className="mb-3 flex items-center gap-2">
            <div className="text-2xl">⚠️</div>
            <div>
              <h2 className="text-xl font-bold text-orange-700 dark:text-orange-300">
                Staffing Intelligence
              </h2>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Systemet har fundet potentielle bemandingsproblemer.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {staffingWarnings.map((warning, index) => (
              <div
                key={index}
                className="rounded-xl border border-orange-200 bg-white p-4 text-sm text-orange-700 dark:border-orange-900 dark:bg-gray-900 dark:text-orange-300"
              >
                {warning}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm dark:border-purple-900 dark:bg-purple-950">
        <div className="mb-3 flex items-center gap-2">
          <div className="text-2xl"></div>
          <div>
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300">
              Predictive Staffing
            </h2>
            <p className="text-sm text-purple-600 dark:text-purple-400">
              Systemet forudsiger fremtidig staffing pressure.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(predictiveStaffing.length > 0
            ? predictiveStaffing
            : ["Ingen predictive staffing alerts lige nu."]
          ).map((prediction, index) => (
            <div
              key={index}
              className="rounded-xl border border-purple-200 bg-white p-4 text-sm text-purple-700 dark:border-purple-900 dark:bg-gray-900 dark:text-purple-300"
            >
              {prediction}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
