import Link from "next/link";

type DashboardOverviewSectionsProps = {
  movieCount: number;
  soldSeatsToday: number;
  seatLoadPercent: number;
  shiftCount: number;
  movieDataAvailable: boolean;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
    shiftTrades: boolean;
    payroll: boolean;
  };
};

type Shortcut = {
  enabled: boolean;
  href: string;
  title: string;
  description: string;
};

const panelClass =
  "rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";

export default function DashboardOverviewSections({
  movieCount,
  soldSeatsToday,
  seatLoadPercent,
  shiftCount,
  movieDataAvailable,
  moduleAccess,
}: DashboardOverviewSectionsProps) {
  const shortcuts: Shortcut[] = [
    {
      enabled: moduleAccess.schedule,
      href: "/schedule",
      title: "Se dagens vagtplan",
      description: "Åbn vagter, filmprogram og dagens bemanding.",
    },
    {
      enabled: moduleAccess.timeTracking,
      href: "/clock",
      title: "Stempel ind eller ud",
      description: "Åbn tidsuret og registrer din arbejdstid.",
    },
    {
      enabled: moduleAccess.shiftTrades,
      href: "/shift-trades",
      title: "Arbejd med vagtbytter",
      description: "Se åbne bytter og dine egne anmodninger.",
    },
    {
      enabled: moduleAccess.payroll,
      href: "/payroll",
      title: "Åbn lønbehandling",
      description: "Gå til lønperioder, kontrol og eksport.",
    },
  ].filter((shortcut) => shortcut.enabled);

  if (!moduleAccess.schedule && shortcuts.length === 0) {
    return null;
  }

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {moduleAccess.schedule && (
        <div className={panelClass}>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Biograf i dag
          </h2>
          {!movieDataAvailable && (
            <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              Filmprogrammet er tomt eller ikke tilgængeligt.
              Filmrelaterede nøgletal kan derfor ikke vurderes.
            </p>
          )}
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Forestillinger
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {movieDataAvailable ? movieCount : "Ikke tilgængelig"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Solgte billetter
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {movieDataAvailable ? soldSeatsToday : "Ikke tilgængelig"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                Belægning
              </span>
              <span className="font-medium text-gray-950 dark:text-white">
                {movieDataAvailable ? `${seatLoadPercent}%` : "Ikke tilgængelig"}
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
            Gå direkte til
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Vælg den arbejdsflade, du skal bruge nu.
          </p>
          <div className="mt-4 grid gap-3">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              >
                <span>
                  <span className="block font-semibold text-gray-950 dark:text-white">
                    {shortcut.title}
                  </span>
                  <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-lg text-blue-700 transition group-hover:translate-x-1 dark:text-blue-300"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
