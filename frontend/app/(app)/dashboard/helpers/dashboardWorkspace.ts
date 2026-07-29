export const DASHBOARD_VIEW_MODE_STORAGE_KEY =
  "cinema-vagtplan.dashboard.view-mode.v1";
export const DASHBOARD_VIEW_QUERY_PARAM = "view";

export type DashboardViewMode = "operations" | "complete";
export type DashboardViewQueryValue = "drift" | "fuld";

export type DashboardWorkspaceSectionId =
  | "dashboard-operations-status"
  | "dashboard-priority-actions"
  | "dashboard-daily-overview"
  | "dashboard-work-forward"
  | "dashboard-staffing"
  | "dashboard-analysis";

export type DashboardWorkspaceSection = {
  id: DashboardWorkspaceSectionId;
  label: string;
  shortLabel: string;
  description: string;
  attentionCount?: number;
};

type GetDashboardWorkspaceSectionsOptions = {
  showStaffing: boolean;
  showAnalysis: boolean;
  priorityCount: number;
  staffingWarningsCount: number;
};

const DASHBOARD_SECTION_IDS: readonly DashboardWorkspaceSectionId[] = [
  "dashboard-operations-status",
  "dashboard-priority-actions",
  "dashboard-daily-overview",
  "dashboard-work-forward",
  "dashboard-staffing",
  "dashboard-analysis",
];

export function isDashboardViewMode(
  value: string | null,
): value is DashboardViewMode {
  return value === "operations" || value === "complete";
}

export function dashboardViewModeToQueryValue(
  viewMode: DashboardViewMode,
): DashboardViewQueryValue {
  return viewMode === "operations" ? "drift" : "fuld";
}

export function dashboardViewModeFromQueryValue(
  value: string | null,
): DashboardViewMode | null {
  if (value === "drift") {
    return "operations";
  }

  if (value === "fuld") {
    return "complete";
  }

  return null;
}

export function isDashboardWorkspaceSectionId(
  value: string | null,
): value is DashboardWorkspaceSectionId {
  return Boolean(
    value &&
      DASHBOARD_SECTION_IDS.includes(value as DashboardWorkspaceSectionId),
  );
}

export function getDashboardSectionFromHash(
  hash: string,
): DashboardWorkspaceSectionId | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const decodedValue = decodeURIComponent(value);

  return isDashboardWorkspaceSectionId(decodedValue) ? decodedValue : null;
}

export function buildDashboardWorkspaceUrl({
  currentUrl,
  viewMode,
  sectionId,
}: {
  currentUrl: string;
  viewMode: DashboardViewMode;
  sectionId?: DashboardWorkspaceSectionId | null;
}): string {
  const url = new URL(currentUrl);
  url.searchParams.set(
    DASHBOARD_VIEW_QUERY_PARAM,
    dashboardViewModeToQueryValue(viewMode),
  );

  if (sectionId) {
    url.hash = sectionId;
  }

  return url.toString();
}

export function getDashboardWorkspaceSections({
  showStaffing,
  showAnalysis,
  priorityCount,
  staffingWarningsCount,
}: GetDashboardWorkspaceSectionsOptions): DashboardWorkspaceSection[] {
  const sections: DashboardWorkspaceSection[] = [];

  if (showStaffing) {
    sections.push({
      id: "dashboard-operations-status",
      label: "Driftsstatus",
      shortLabel: "Status",
      description: "Samlet vurdering af dagens drift og datagrundlag.",
    });
  }

  sections.push(
    {
      id: "dashboard-priority-actions",
      label: "Åbne opgaver",
      shortLabel: "Opgaver",
      description: "Poster og bemandingsforhold, der kræver opfølgning.",
      attentionCount: priorityCount > 0 ? priorityCount : undefined,
    },
    {
      id: "dashboard-daily-overview",
      label: "Dagens overblik",
      shortLabel: "Overblik",
      description: "Dagens vigtigste nøgletal og bekræftede nulresultater.",
    },
    {
      id: "dashboard-work-forward",
      label: "Arbejd videre",
      shortLabel: "Genveje",
      description: "Rolle- og modulbevidste indgange til det videre arbejde.",
    },
  );

  if (showStaffing) {
    sections.push({
      id: "dashboard-staffing",
      label: "Bemanding",
      shortLabel: "Bemanding",
      description: "Advarsler, forventet behov og direkte handlinger.",
      attentionCount:
        staffingWarningsCount > 0 ? staffingWarningsCount : undefined,
    });
  }

  if (showAnalysis) {
    sections.push({
      id: "dashboard-analysis",
      label: "Automatiske vurderinger",
      shortLabel: "Analyse",
      description: "Regelgrundlag, belastning og dagens beregnede mønstre.",
    });
  }

  return sections;
}
