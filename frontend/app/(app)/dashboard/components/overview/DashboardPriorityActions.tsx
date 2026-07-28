import Link from "next/link";

import DashboardSectionHeading from "../layout/DashboardSectionHeading";

type DashboardPriorityActionsProps = {
  openShiftTrades: number;
  pendingLeaveRequests: number;
  staffingWarningsCount: number;
  moduleAccess: {
    leave: boolean;
    shiftTrades: boolean;
    schedule: boolean;
    staffingAi: boolean;
  };
  hasAdministrativeAccess: boolean;
};

type PriorityAction = {
  kind: "staffing" | "leave" | "shiftTrades";
  href: string;
  title: string;
  description: string;
  count: number;
  actionLabel: string;
  tone: "amber" | "orange" | "blue";
};

function getShiftTradeDescription(
  count: number,
  hasAdministrativeAccess: boolean,
) {
  if (hasAdministrativeAccess) {
    return count === 1
      ? "1 åbent vagtbytte er klar til gennemgang."
      : `${count} åbne vagtbytter er klar til gennemgang.`;
  }

  return count === 1
    ? "1 vagt er tilgængelig i vagtpuljen."
    : `${count} vagter er tilgængelige i vagtpuljen.`;
}

function getLeaveDescription(
  count: number,
  hasAdministrativeAccess: boolean,
) {
  if (hasAdministrativeAccess) {
    return count === 1
      ? "1 fraværsansøgning afventer godkendelse."
      : `${count} fraværsansøgninger afventer godkendelse.`;
  }

  return count === 1
    ? "1 af dine fraværsansøgninger afventer behandling."
    : `${count} af dine fraværsansøgninger afventer behandling.`;
}

const toneClasses = {
  amber: {
    card: "border-amber-200 hover:border-amber-400 dark:border-amber-900 dark:hover:border-amber-600",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    action: "text-amber-800 dark:text-amber-300",
  },
  orange: {
    card: "border-orange-200 hover:border-orange-400 dark:border-orange-900 dark:hover:border-orange-600",
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    action: "text-orange-800 dark:text-orange-300",
  },
  blue: {
    card: "border-blue-200 hover:border-blue-400 dark:border-blue-900 dark:hover:border-blue-600",
    badge:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    action: "text-blue-800 dark:text-blue-300",
  },
};

export default function DashboardPriorityActions({
  openShiftTrades,
  pendingLeaveRequests,
  staffingWarningsCount,
  moduleAccess,
  hasAdministrativeAccess,
}: DashboardPriorityActionsProps) {
  const allActions: PriorityAction[] = [
    {
      kind: "staffing",
      href: hasAdministrativeAccess ? "/shift-planning" : "/schedule",
      title: "Bemanding kræver opmærksomhed",
      description:
        staffingWarningsCount === 1
          ? "1 forhold i dagens bemanding bør gennemgås."
          : `${staffingWarningsCount} forhold i dagens bemanding bør gennemgås.`,
      count: staffingWarningsCount,
      actionLabel: hasAdministrativeAccess
        ? "Åbn vagtplanlægning"
        : "Se dagens vagtplan",
      tone: "orange",
    },
    {
      kind: "leave",
      href: hasAdministrativeAccess
        ? "/leave-approval"
        : "/leave-requests",
      title: hasAdministrativeAccess
        ? "Fravær til godkendelse"
        : "Mit fravær der afventer",
      description: getLeaveDescription(
        pendingLeaveRequests,
        hasAdministrativeAccess,
      ),
      count: pendingLeaveRequests,
      actionLabel: hasAdministrativeAccess
        ? "Godkend fravær"
        : "Se mit fravær",
      tone: "amber",
    },
    {
      kind: "shiftTrades",
      href: "/shift-trades",
      title: hasAdministrativeAccess
        ? "Åbne vagtbytter"
        : "Vagter i vagtpuljen",
      description: getShiftTradeDescription(
        openShiftTrades,
        hasAdministrativeAccess,
      ),
      count: openShiftTrades,
      actionLabel: hasAdministrativeAccess
        ? "Gennemgå vagtbytter"
        : "Åbn vagtpuljen",
      tone: "blue",
    },
  ];

  const actions = allActions.filter((action) => {
    if (action.kind === "staffing") {
      return (
        moduleAccess.schedule &&
        moduleAccess.staffingAi &&
        action.count > 0
      );
    }
    if (action.kind === "shiftTrades") {
      return moduleAccess.shiftTrades && action.count > 0;
    }
    return moduleAccess.leave && action.count > 0;
  });

  if (actions.length === 0) {
    return null;
  }

  const totalOpenItems = actions.reduce(
    (sum, action) => sum + action.count,
    0,
  );

  return (
    <section aria-labelledby="dashboard-priority-actions-heading">
      <DashboardSectionHeading
        id="dashboard-priority-actions-heading"
        eyebrow="Kræver handling"
        title="Dagens åbne opgaver"
        description="Start her med de forhold, der stadig afventer eller kræver en konkret beslutning."
        action={
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {totalOpenItems} åbne
          </span>
        }
      />
      <div
        className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        {actions.map((action) => {
          const classes = toneClasses[action.tone];
          return (
            <Link
              key={`${action.href}-${action.title}`}
              href={action.href}
              className={`group rounded-2xl border bg-white p-5 text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 ${classes.card}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{action.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {action.description}
                  </p>
                </div>
                <span
                  className={`inline-flex min-w-10 items-center justify-center rounded-full px-3 py-1 text-sm font-bold ${classes.badge}`}
                >
                  {action.count}
                </span>
              </div>
              <div
                className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2 ${classes.action}`}
              >
                {action.actionLabel}
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
