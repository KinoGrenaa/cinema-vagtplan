type DashboardOverviewSectionsProps = {
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  shiftCount: number;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
    shiftTrades: boolean;
    payroll: boolean;
  };
};

const shortcutClasses = {
  schedule:
    "rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-700",
  timeTracking:
    "rounded-xl bg-green-600 px-4 py-3 text-center font-medium text-white hover:bg-green-700",
  shiftTrades:
    "rounded-xl bg-purple-600 px-4 py-3 text-center font-medium text-white hover:bg-purple-700",
  payroll:
    "rounded-xl bg-gray-800 px-4 py-3 text-center font-medium text-white hover:bg-gray-900",
};

export default function DashboardOverviewSections({
  movieCount,
  soldSeatsToday,
  seatLoadPercent,
  shiftCount,
  moduleAccess,
}: DashboardOverviewSectionsProps) {
  const shortcuts = [
    {
      enabled: moduleAccess.schedule,
      href: "/schedule",
      label: "Vagtplan",
      className:
        shortcutClasses.schedule,
    },
    {
      enabled:
        moduleAccess.timeTracking,
      href: "/clock",
      label: "Tidsregistrering",
      className:
        shortcutClasses.timeTracking,
    },
    {
      enabled:
        moduleAccess.shiftTrades,
      href: "/shift-trades",
      label: "Vagtbytte",
      className:
        shortcutClasses.shiftTrades,
    },
    {
      enabled: moduleAccess.payroll,
      href: "/payroll",
      label: "Løn",
      className:
        shortcutClasses.payroll,
    },
  ].filter(
    (shortcut) => shortcut.enabled,
  );

  if (
    !moduleAccess.schedule &&
    shortcuts.length === 0
  ) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {moduleAccess.schedule && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold">
            Biograf i dag
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Forestillinger
              </span>
              <span className="font-medium">
                {movieCount}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Solgte billetter
              </span>
              <span className="font-medium">
                {soldSeatsToday}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Belægning
              </span>
              <span className="font-medium">
                {seatLoadPercent}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">
                Vagter i dag
              </span>
              <span className="font-medium">
                {shiftCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {shortcuts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold">
            Genveje
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {shortcuts.map(
              (shortcut) => (
                <a
                  key={shortcut.href}
                  href={shortcut.href}
                  className={
                    shortcut.className
                  }
                >
                  {shortcut.label}
                </a>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  );
}
