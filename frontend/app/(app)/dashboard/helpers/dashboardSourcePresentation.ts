import type {
  DashboardSourceState,
  DashboardSourceStatus,
} from "../types";

export function isDashboardSourceReadable(
  status: DashboardSourceStatus,
) {
  return status.state === "fresh" || status.state === "stale";
}

export function isDashboardSourceStale(
  status: DashboardSourceStatus,
) {
  return status.state === "stale";
}

export function getDashboardSourceLabel(
  state: DashboardSourceState,
) {
  if (state === "fresh") return "Aktuelle data";
  if (state === "stale") return "Tidligere data";
  if (state === "unavailable") return "Ikke tilgængelig";
  return "Deaktiveret";
}

export function getDashboardSourceUnavailableText(
  status: DashboardSourceStatus,
  fallback: string,
) {
  return status.message?.trim() || fallback;
}

export function combineDashboardSourceStatuses(
  statuses: DashboardSourceStatus[],
): DashboardSourceStatus {
  const activeStatuses = statuses.filter(
    (status) => status.state !== "disabled",
  );

  if (activeStatuses.length === 0) {
    return { state: "disabled" };
  }

  const unavailable = activeStatuses.filter(
    (status) => status.state === "unavailable",
  );
  if (unavailable.length > 0) {
    const messages = unavailable
      .map((status) => status.message?.trim())
      .filter((message): message is string => Boolean(message));

    return {
      state: "unavailable",
      message: messages.length > 0 ? messages.join(" ") : undefined,
    };
  }

  if (activeStatuses.some((status) => status.state === "stale")) {
    return { state: "stale" };
  }

  return { state: "fresh" };
}
