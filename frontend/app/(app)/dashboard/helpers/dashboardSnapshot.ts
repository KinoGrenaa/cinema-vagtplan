import { formatHours } from "./dashboardHelpers";
import { cleanDashboardInsight } from "./dashboardPresentation";
import {
  combineDashboardSourceStatuses,
  getDashboardSourceLabel,
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "./dashboardSourcePresentation";
import type {
  DashboardSourceKey,
  DashboardSourceStatus,
  DashboardSourceStatusMap,
} from "../types";

export type DashboardSnapshotMetric = {
  label: string;
  value: string;
  sourceKeys: DashboardSourceKey[];
};

export type DashboardSnapshotTask = {
  label: string;
  value: string;
  sourceKeys: DashboardSourceKey[];
};

export type DashboardSnapshot = {
  date: string;
  dateLabel: string;
  generatedAt: string;
  generatedAtLabel: string;
  userLabel: string;
  roleLabel: string;
  viewLabel: string;
  metrics: DashboardSnapshotMetric[];
  tasks: DashboardSnapshotTask[];
  staffingWarnings: string[];
  predictiveStaffing: string[];
  recommendations: string[];
  sourceStatus: DashboardSourceStatusMap;
};

type CreateDashboardSnapshotInput = {
  date: string;
  generatedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  };
  viewMode: "operations" | "complete";
  metrics: {
    plannedHours: number;
    registeredHours: number;
    shiftCount: number;
    movieCount: number;
    soldSeats: number;
    seatLoadPercent: number;
    canShowPersonalTime: boolean;
  };
  tasks: {
    pendingLeaveRequests: number;
    openShiftTrades: number;
    staffingWarningsCount: number;
  };
  staffingWarnings: string[];
  predictiveStaffing: string[];
  recommendations: string[];
  sourceStatus: DashboardSourceStatusMap;
  moduleAccess: {
    schedule: boolean;
    timeTracking: boolean;
    leave: boolean;
    shiftTrades: boolean;
    staffingAi: boolean;
  };
};

const SOURCE_LABELS: Record<DashboardSourceKey, string> = {
  shifts: "Vagtplan",
  timeEntries: "Tidsregistreringer",
  leaveRequests: "Fravær",
  shiftTrades: "Vagtbytter",
  movies: "Filmprogram",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "full",
    timeZone: "Europe/Copenhagen",
  }).format(value);
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(value));
}

function roleLabel(role: string) {
  if (role === "MASTER") return "MASTER";
  if (role === "ADMIN") return "Administrator";
  return "Medarbejder";
}

function readableValue(
  status: DashboardSourceStatus,
  value: string,
) {
  if (!isDashboardSourceReadable(status)) {
    return "Ikke tilgængelig";
  }

  return isDashboardSourceStale(status)
    ? `${value} (tidligere data)`
    : value;
}

function metric(
  label: string,
  value: string,
  sourceKeys: DashboardSourceKey[],
  sourceStatus: DashboardSourceStatusMap,
): DashboardSnapshotMetric {
  return {
    label,
    value: readableValue(
      combineDashboardSourceStatuses(
        sourceKeys.map((key) => sourceStatus[key]),
      ),
      value,
    ),
    sourceKeys,
  };
}

function task(
  label: string,
  count: number,
  sourceKeys: DashboardSourceKey[],
  sourceStatus: DashboardSourceStatusMap,
): DashboardSnapshotTask {
  return {
    label,
    value: readableValue(
      combineDashboardSourceStatuses(
        sourceKeys.map((key) => sourceStatus[key]),
      ),
      String(count),
    ),
    sourceKeys,
  };
}

export function createDashboardSnapshot(
  input: CreateDashboardSnapshotInput,
): DashboardSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const metrics: DashboardSnapshotMetric[] = [];
  const tasks: DashboardSnapshotTask[] = [];

  if (input.moduleAccess.schedule) {
    metrics.push(
      metric(
        "Planlagte arbejdstimer",
        formatHours(input.metrics.plannedHours),
        ["shifts"],
        input.sourceStatus,
      ),
      metric(
        "Vagter",
        String(input.metrics.shiftCount),
        ["shifts"],
        input.sourceStatus,
      ),
      metric(
        "Forestillinger",
        String(input.metrics.movieCount),
        ["movies"],
        input.sourceStatus,
      ),
      metric(
        "Solgte billetter",
        String(input.metrics.soldSeats),
        ["movies"],
        input.sourceStatus,
      ),
      metric(
        "Belægning",
        `${input.metrics.seatLoadPercent}%`,
        ["movies"],
        input.sourceStatus,
      ),
    );
  }

  if (
    input.moduleAccess.timeTracking &&
    input.metrics.canShowPersonalTime
  ) {
    metrics.push(
      metric(
        "Mine afsluttede timer",
        formatHours(input.metrics.registeredHours),
        ["timeEntries"],
        input.sourceStatus,
      ),
    );
  }

  if (input.moduleAccess.staffingAi && input.moduleAccess.schedule) {
    tasks.push(
      task(
        "Bemandingsforhold",
        input.tasks.staffingWarningsCount,
        ["shifts", "movies"],
        input.sourceStatus,
      ),
    );
  }

  if (input.moduleAccess.leave) {
    tasks.push(
      task(
        "Afventende fravær",
        input.tasks.pendingLeaveRequests,
        ["leaveRequests"],
        input.sourceStatus,
      ),
    );
  }

  if (input.moduleAccess.shiftTrades) {
    tasks.push(
      task(
        "Åbne vagtbytter",
        input.tasks.openShiftTrades,
        ["shiftTrades"],
        input.sourceStatus,
      ),
    );
  }

  return {
    date: input.date,
    dateLabel: formatDate(input.date),
    generatedAt,
    generatedAtLabel: formatTimestamp(generatedAt),
    userLabel: `${input.user.firstName} ${input.user.lastName}`.trim(),
    roleLabel: roleLabel(input.user.role),
    viewLabel:
      input.viewMode === "complete" ? "Fuld visning" : "Driftsvisning",
    metrics,
    tasks,
    staffingWarnings: input.staffingWarnings.map(cleanDashboardInsight),
    predictiveStaffing: input.predictiveStaffing.map(cleanDashboardInsight),
    recommendations: input.recommendations.map(cleanDashboardInsight),
    sourceStatus: input.sourceStatus,
  };
}

function sourceNames(sourceKeys: DashboardSourceKey[]) {
  return sourceKeys.map((key) => SOURCE_LABELS[key]).join(" + ");
}

function sourceStatusRows(snapshot: DashboardSnapshot) {
  return (Object.keys(snapshot.sourceStatus) as DashboardSourceKey[]).map(
    (key) => ({
      source: SOURCE_LABELS[key],
      status: getDashboardSourceLabel(snapshot.sourceStatus[key].state),
      message: snapshot.sourceStatus[key].message?.trim() ?? "",
    }),
  );
}

export function buildDashboardSnapshotText(
  snapshot: DashboardSnapshot,
) {
  const lines = [
    "DRIFTSOVERBLIK",
    snapshot.dateLabel,
    `Genereret: ${snapshot.generatedAtLabel}`,
    `Bruger: ${snapshot.userLabel} (${snapshot.roleLabel})`,
    `Visning: ${snapshot.viewLabel}`,
    "",
    "NØGLETAL",
    ...snapshot.metrics.map(
      (item) =>
        `- ${item.label}: ${item.value} [${sourceNames(item.sourceKeys)}]`,
    ),
    "",
    "ÅBNE OPGAVER",
    ...snapshot.tasks.map(
      (item) =>
        `- ${item.label}: ${item.value} [${sourceNames(item.sourceKeys)}]`,
    ),
    "",
    "BEMANDINGSFORHOLD",
    ...(snapshot.staffingWarnings.length > 0
      ? snapshot.staffingWarnings.map((item) => `- ${item}`)
      : ["- Ingen kendte bemandingsadvarsler"]),
    "",
    "BEREGNET BELASTNING",
    ...(snapshot.predictiveStaffing.length > 0
      ? snapshot.predictiveStaffing.map((item) => `- ${item}`)
      : ["- Ingen beregnede belastningspunkter"]),
    "",
    "ANBEFALINGER",
    ...(snapshot.recommendations.length > 0
      ? snapshot.recommendations.map((item) => `- ${item}`)
      : ["- Ingen automatiske anbefalinger"]),
    "",
    "DATAKILDER",
    ...sourceStatusRows(snapshot).map(
      (item) =>
        `- ${item.source}: ${item.status}${
          item.message ? ` – ${item.message}` : ""
        }`,
    ),
  ];

  return lines.join("\n");
}

function escapeCsv(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

export function buildDashboardSnapshotCsv(
  snapshot: DashboardSnapshot,
) {
  const rows: Array<Array<string | number>> = [
    ["Sektion", "Punkt", "Værdi", "Datakilde", "Bemærkning"],
    ["Rapport", "Dato", snapshot.dateLabel, "", ""],
    ["Rapport", "Genereret", snapshot.generatedAtLabel, "", ""],
    ["Rapport", "Bruger", snapshot.userLabel, "", snapshot.roleLabel],
    ["Rapport", "Visning", snapshot.viewLabel, "", ""],
    ...snapshot.metrics.map((item) => [
      "Nøgletal",
      item.label,
      item.value,
      sourceNames(item.sourceKeys),
      "",
    ]),
    ...snapshot.tasks.map((item) => [
      "Åbne opgaver",
      item.label,
      item.value,
      sourceNames(item.sourceKeys),
      "",
    ]),
    ...snapshot.staffingWarnings.map((item, index) => [
      "Bemandingsforhold",
      `Punkt ${index + 1}`,
      item,
      "Vagtplan + filmprogram",
      "",
    ]),
    ...snapshot.predictiveStaffing.map((item, index) => [
      "Beregnet belastning",
      `Punkt ${index + 1}`,
      item,
      "Vagtplan + filmprogram",
      "Regelbaseret vurdering",
    ]),
    ...snapshot.recommendations.map((item, index) => [
      "Anbefalinger",
      `Punkt ${index + 1}`,
      item,
      "Dashboardberegning",
      "Regelbaseret vurdering",
    ]),
    ...sourceStatusRows(snapshot).map((item) => [
      "Datakilder",
      item.source,
      item.status,
      item.source,
      item.message,
    ]),
  ];

  return `\uFEFF${rows
    .map((row) => row.map(escapeCsv).join(";"))
    .join("\r\n")}`;
}

export function createDashboardSnapshotFilename(
  snapshot: DashboardSnapshot,
) {
  return `driftsoverblik-${snapshot.date}.csv`;
}
