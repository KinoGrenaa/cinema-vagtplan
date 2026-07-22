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

const shortcutBaseClass =
  "rounded-xl px-4 py-3 text-center font-medium text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

const shortcutClasses = {
  schedule:
    `${shortcutBaseClass} bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400`,
  timeTracking:
    `${shortcutBaseClass} bg-green-700 hover:bg-green-800 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400`,
  shiftTrades:
    `${shortcutBaseClass} bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 dark:focus-visible:ring-purple-400`,
  payroll:
    `${shortcutBaseClass} bg-gray-800 hover:bg-gray-900 focus-visible:ring-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus-visible:ring-gray-400`,
};

const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";

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
        <div className={panelClass}>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Biograf i dag
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Forestillinger
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {movieCount}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Solgte billetter
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {soldSeatsToday}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Belægning
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {seatLoadPercent}%
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Vagter i dag
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {shiftCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {shortcuts.length > 0 && (
        <div className={panelClass}>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
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
