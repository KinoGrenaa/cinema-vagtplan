import Link from "next/link";

type DashboardPriorityActionsProps = {
  openShiftTrades: number;
  pendingLeaveRequests: number;
  moduleAccess: {
    leave: boolean;
    shiftTrades: boolean;
  };
};

type PriorityAction = {
  href: string;
  title: string;
  description: string;
  count: number;
  actionLabel: string;
};

function getShiftTradeDescription(count: number) {
  return count === 1
    ? "1 åbent vagtbytte er klar til gennemgang."
    : `${count} åbne vagtbytter er klar til gennemgang.`;
}

function getLeaveDescription(count: number) {
  return count === 1
    ? "1 fraværsansøgning afventer."
    : `${count} fraværsansøgninger afventer.`;
}

export default function DashboardPriorityActions({
  openShiftTrades,
  pendingLeaveRequests,
  moduleAccess,
}: DashboardPriorityActionsProps) {
  const actions: PriorityAction[] = [
    {
      href: "/shift-trades",
      title: "Åbne vagtbytter",
      description: getShiftTradeDescription(openShiftTrades),
      count: openShiftTrades,
      actionLabel: "Gennemgå vagtbytter",
    },
    {
      href: "/leave-requests",
      title: "Fravær der afventer",
      description: getLeaveDescription(pendingLeaveRequests),
      count: pendingLeaveRequests,
      actionLabel: "Se fravær",
    },
  ].filter((action) => {
    if (action.href === "/shift-trades") {
      return moduleAccess.shiftTrades && action.count > 0;
    }

    return moduleAccess.leave && action.count > 0;
  });

  if (actions.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="dashboard-priority-actions-heading"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm transition-colors dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
        Aktuelt
      </p>
      <h2
        id="dashboard-priority-actions-heading"
        className="mt-2 text-2xl font-bold"
      >
        Handlinger med åbne poster
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900 dark:text-amber-100/90">
        Start her, når du vil følge op på det, der stadig afventer.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-xl border border-amber-200 bg-white p-5 text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:border-amber-900 dark:bg-gray-900 dark:text-white dark:hover:border-amber-600 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {action.description}
                </p>
              </div>
              <span className="inline-flex min-w-10 items-center justify-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {action.count}
              </span>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-amber-800 transition group-hover:gap-2 dark:text-amber-300">
              {action.actionLabel}
              <span aria-hidden="true">→</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
