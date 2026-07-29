import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDashboardWorkspaceUrl,
  dashboardViewModeFromQueryValue,
  dashboardViewModeToQueryValue,
  getDashboardSectionFromHash,
  getDashboardWorkspaceSections,
  isDashboardViewMode,
  isDashboardWorkspaceSectionId,
} from "../../app/(app)/dashboard/helpers/dashboardWorkspace";

test("dashboardvisninger valideres og konverteres symmetrisk", () => {
  assert.equal(isDashboardViewMode("operations"), true);
  assert.equal(isDashboardViewMode("complete"), true);
  assert.equal(isDashboardViewMode("drift"), false);
  assert.equal(dashboardViewModeToQueryValue("operations"), "drift");
  assert.equal(dashboardViewModeToQueryValue("complete"), "fuld");
  assert.equal(dashboardViewModeFromQueryValue("drift"), "operations");
  assert.equal(dashboardViewModeFromQueryValue("fuld"), "complete");
  assert.equal(dashboardViewModeFromQueryValue("andet"), null);
});

test("sektionshash accepterer kun kendte dashboardsektioner", () => {
  assert.equal(
    getDashboardSectionFromHash("#dashboard-priority-actions"),
    "dashboard-priority-actions",
  );
  assert.equal(
    getDashboardSectionFromHash("dashboard-analysis"),
    "dashboard-analysis",
  );
  assert.equal(getDashboardSectionFromHash("#ukendt"), null);
  assert.equal(isDashboardWorkspaceSectionId("dashboard-staffing"), true);
  assert.equal(isDashboardWorkspaceSectionId(null), false);
});

test("workspace-URL bevarer øvrige query-parametre", () => {
  const value = buildDashboardWorkspaceUrl({
    currentUrl: "https://example.test/dashboard?cinemaId=4#old",
    viewMode: "operations",
    sectionId: "dashboard-daily-overview",
  });
  const url = new URL(value);
  assert.equal(url.searchParams.get("cinemaId"), "4");
  assert.equal(url.searchParams.get("view"), "drift");
  assert.equal(url.hash, "#dashboard-daily-overview");
});

test("driftsvisning skjuler analysedelen men bevarer driftssektioner", () => {
  const sections = getDashboardWorkspaceSections({
    showStaffing: true,
    showAnalysis: false,
    priorityCount: 3,
    staffingWarningsCount: 2,
  });
  assert.deepEqual(
    sections.map((section) => section.id),
    [
      "dashboard-operations-status",
      "dashboard-priority-actions",
      "dashboard-daily-overview",
      "dashboard-work-forward",
      "dashboard-staffing",
    ],
  );
  assert.equal(sections[1].attentionCount, 3);
  assert.equal(sections[4].attentionCount, 2);
});

test("uden bemandingsmodul vises kun de generelle sektioner", () => {
  const sections = getDashboardWorkspaceSections({
    showStaffing: false,
    showAnalysis: false,
    priorityCount: 0,
    staffingWarningsCount: 0,
  });
  assert.deepEqual(
    sections.map((section) => section.id),
    [
      "dashboard-priority-actions",
      "dashboard-daily-overview",
      "dashboard-work-forward",
    ],
  );
  assert.equal(sections[0].attentionCount, undefined);
});
