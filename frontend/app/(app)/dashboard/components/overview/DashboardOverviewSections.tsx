import Link from "next/link";

import DashboardSectionHeading from "../layout/DashboardSectionHeading";

type DashboardOverviewSectionsProps = {
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
    leave: boolean;
    shiftTrades: boolean;
    payroll: boolean;
  };
  hasAdministrativeAccess: boolean;
};

type Shortcut = {
  enabled: boolean;
  href: string;
  category: string;
  title: string;
  description: string;
};

export default function DashboardOverviewSections({
  moduleAccess,
  hasAdministrativeAccess,
}: DashboardOverviewSectionsProps) {
  const shortcuts: Shortcut[] = [
    {
      enabled: moduleAccess.schedule,
      href: "/schedule",
      category: "Vagtplan",
      title: "Se dagens vagtplan",
      description: "Åbn vagter, filmprogram og dagens bemanding.",
    },
    {
      enabled: moduleAccess.schedule && hasAdministrativeAccess,
      href: "/shift-planning",
      category: "Planlægning",
      title: "Planlæg og tilpas vagter",
      description: "Arbejd med bemanding, ændringer og publicering.",
    },
    {
      enabled: moduleAccess.leave,
      href: hasAdministrativeAccess
        ? "/leave-approval"
        : "/leave-requests",
      category: "Fravær",
      title: hasAdministrativeAccess
        ? "Behandl fravær"
        : "Se og opret fravær",
      description: hasAdministrativeAccess
        ? "Gennemgå ansøgninger og planens fravær."
        : "Følg dine ansøgninger eller opret en ny.",
    },
    {
      enabled: moduleAccess.shiftTrades,
      href: "/shift-trades",
      category: "Vagtbytte",
      title: hasAdministrativeAccess
        ? "Arbejd med vagtbytter"
        : "Åbn vagtpuljen",
      description: hasAdministrativeAccess
        ? "Se åbne bytter og medarbejdernes anmodninger."
        : "Se åbne vagter og dine egne anmodninger.",
    },
    {
      enabled: moduleAccess.payroll && hasAdministrativeAccess,
      href: "/payroll",
      category: "Løn",
      title: "Åbn lønbehandling",
      description: "Gå til lønperioder, kontrol og eksport.",
    },
  ].filter((shortcut) => shortcut.enabled);

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-shortcuts-heading">
      <DashboardSectionHeading
        id="dashboard-shortcuts-heading"
        eyebrow="Genveje"
        title="Arbejd videre"
        description="Vælg den arbejdsflade, der passer til din rolle og de moduler, som er aktive for biografen."
      />
      <div
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {shortcuts.map((shortcut) => (
          <Link
            key={`${shortcut.href}-${shortcut.title}`}
            href={shortcut.href}
            className="group flex min-h-40 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:hover:border-blue-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                {shortcut.category}
              </p>
              <h3 className="mt-2 text-lg font-bold">{shortcut.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {shortcut.description}
              </p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 transition group-hover:gap-2 dark:text-blue-300">
              Åbn
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
