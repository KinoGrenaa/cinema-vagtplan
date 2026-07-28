import Link from "next/link";

import {
  combineDashboardSourceStatuses,
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../helpers/dashboardSourcePresentation";
import type {
  DashboardSourceKey,
  DashboardSourceStatusMap,
} from "../../types";
import DashboardSectionHeading from "../layout/DashboardSectionHeading";
import DashboardSourceBadge from "../status/DashboardSourceBadge";

type DashboardPriorityActionsProps = {
  openShiftTrades: number;
  pendingLeaveRequests: number;
  staffingWarningsCount: number;
  sourceStatus: DashboardSourceStatusMap;
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
  sourceKeys: DashboardSourceKey[];
};

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

export default function DashboardPriorityActions({
  openShiftTrades,
  pendingLeaveRequests,
  staffingWarningsCount,
  sourceStatus,
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
      sourceKeys: ["shifts", "movies"],
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
      sourceKeys: ["leaveRequests"],
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
      sourceKeys: ["shiftTrades"],
    },
  ];

  const enabledActions = allActions.filter((action) => {
    if (action.kind === "staffing") {
      return moduleAccess.schedule && moduleAccess.staffingAi;
    }
    if (action.kind === "shiftTrades") {
      return moduleAccess.shiftTrades;
    }
    return moduleAccess.leave;
  });
  const getActionStatus = (action: PriorityAction) =>
    combineDashboardSourceStatuses(
      action.sourceKeys.map((key) => sourceStatus[key]),
    );
  const unavailableActions = enabledActions.filter(
    (action) => !isDashboardSourceReadable(getActionStatus(action)),
  );
  const actions = enabledActions.filter(
    (action) =>
      isDashboardSourceReadable(getActionStatus(action)) &&
      action.count > 0,
  );
  const totalOpenItems = actions.reduce(
    (sum, action) => sum + action.count,
    0,
  );

  if (enabledActions.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="dashboard-priority-actions-heading">
      <DashboardSectionHeading
        id="dashboard-priority-actions-heading"
        eyebrow="Kræver handling"
        title="Dagens åbne opgaver"
        description="Start her med de forhold, der stadig afventer eller kræver en konkret beslutning."
        action={
          actions.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              {totalOpenItems} åbne
            </span>
          ) : undefined
        }
      />

      {unavailableActions.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Det kan ikke afgøres fuldt ud, om alle opgaver er afsluttet. Følgende områder mangler aktuelle data: {unavailableActions.map((action) => action.title).join(", ")}.
        </div>
      )}

      {actions.length === 0 && unavailableActions.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900 shadow-sm dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          <h3 className="font-bold">Ingen kendte åbne opgaver</h3>
          <p className="mt-1 text-sm leading-6 opacity-80">
            De aktuelle data viser ingen opgaver, der kræver handling lige nu.
          </p>
        </div>
      ) : actions.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {actions.map((action) => {
            const classes = toneClasses[action.tone];
            const status = getActionStatus(action);

            return (
              <Link
                key={`${action.href}-${action.title}`}
                href={action.href}
                className={`group rounded-2xl border bg-white p-5 text-gray-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950 ${classes.card}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{action.title}</h3>
                      {isDashboardSourceStale(status) && (
                        <DashboardSourceBadge status={status} />
                      )}
                    </div>
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
      ) : null}
    </section>
  );
}
