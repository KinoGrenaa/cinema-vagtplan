import { formatDateKey } from "./shiftPlanningHelpers";

import type {
  DraftControlSummary,
  DraftDateGroup,
  SavedDraftItem,
} from "./shiftPlanningDraftTypes";

export function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export function formatCreatedAt(value?: string | null) {
  if (!value) {
    return "Ukendt tidspunkt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function getDateKey(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function formatMinute(value: unknown) {
  const minute = Number(value);

  if (!Number.isInteger(minute) || minute < 0 || minute >= 48 * 60) {
    return null;
  }

  const dayOffset = Math.floor(minute / (24 * 60));
  const minuteOfDay = minute % (24 * 60);
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  const formatted =
    String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");

  return dayOffset === 1 ? formatted + " næste dag" : formatted;
}


export function formatDraftItemTimeRange(item: SavedDraftItem) {
  const start = formatMinute(item.plannedStartMinute);
  const end = formatMinute(item.plannedEndMinute);

  if (!start || !end) {
    return "Tid mangler";
  }

  return `kl. ${start} - ${end}`;
}

export function formatDraftItemUserName(item: SavedDraftItem) {
  const name = `${item.userFirstName ?? ""} ${item.userLastName ?? ""}`.trim();

  return name || item.userEmail || "Ikke tildelt";
}

export function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = metadata?.[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getItemJobFunctionName(item: SavedDraftItem) {
  return (
    item.jobFunctionName ||
    getMetadataString(item.metadata, "jobFunctionName") ||
    "Jobfunktion mangler"
  );
}

export function getItemTemplateName(item: SavedDraftItem) {
  return (
    item.scheduleTemplateName ||
    getMetadataString(item.metadata, "scheduleTemplateName") ||
    "Skabelon mangler"
  );
}

export function itemHasTime(item: SavedDraftItem) {
  return Boolean(
    formatMinute(item.plannedStartMinute) && formatMinute(item.plannedEndMinute),
  );
}

export function itemHasJobFunction(item: SavedDraftItem) {
  return getItemJobFunctionName(item) !== "Jobfunktion mangler";
}

export function itemHasTemplate(item: SavedDraftItem) {
  return getItemTemplateName(item) !== "Skabelon mangler";
}

export function getDraftControlSummary(items: SavedDraftItem[]): DraftControlSummary {
  const dateKeys = new Set<string>();

  items.forEach((item) => {
    const dateKey = getDateKey(item.date);

    if (dateKey) {
      dateKeys.add(dateKey);
    }
  });

  return {
    totalItems: items.length,
    dateCount: dateKeys.size,
    unassignedCount: items.filter(
      (item) => !item.userFirstName && !item.userLastName && !item.userEmail,
    ).length,
    warningCount: items.filter((item) =>
      Boolean(item.warningCode || item.warningMessage),
    ).length,
    missingTimeCount: items.filter((item) => !itemHasTime(item)).length,
    missingJobFunctionCount: items.filter((item) => !itemHasJobFunction(item))
      .length,
    missingTemplateCount: items.filter((item) => !itemHasTemplate(item)).length,
  };
}

export function hasControlWarnings(summary: DraftControlSummary) {
  return (
    summary.warningCount > 0 ||
    summary.missingTimeCount > 0 ||
    summary.missingJobFunctionCount > 0 ||
    summary.missingTemplateCount > 0
  );
}

export function getDateGroups(items: SavedDraftItem[]): DraftDateGroup[] {
  const groups = new Map<string, DraftDateGroup>();

  items.forEach((item) => {
    const dateKey = getDateKey(item.date);
    const groupKey = dateKey || "uden-dato";
    const existingGroup = groups.get(groupKey);
    const group = existingGroup ?? {
      dateKey,
      label: dateKey ? formatDateKey(dateKey) : "Dato mangler",
      items: [],
      unassignedCount: 0,
      warningCount: 0,
      missingTimeCount: 0,
    };

    group.items.push(item);

    if (!item.userFirstName && !item.userLastName && !item.userEmail) {
      group.unassignedCount += 1;
    }

    if (item.warningCode || item.warningMessage) {
      group.warningCount += 1;
    }

    if (!itemHasTime(item)) {
      group.missingTimeCount += 1;
    }

    groups.set(groupKey, group);
  });

  return Array.from(groups.values());
}


export function formatCreatedShiftIds(ids?: Array<number | string>) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return null;
  }

  const visibleIds = ids.slice(0, 10).join(", ");
  const hiddenCount = Math.max(0, ids.length - 10);

  return hiddenCount > 0 ? `${visibleIds} + ${hiddenCount} flere` : visibleIds;
}

export function formatAffectedDateLabels(dateKeys?: string[]) {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) {
    return [];
  }

  return Array.from(new Set(dateKeys))
    .filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
    .sort()
    .map((dateKey) => ({ dateKey, label: formatDateKey(dateKey) }));
}
