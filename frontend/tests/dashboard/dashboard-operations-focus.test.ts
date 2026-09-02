import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardPage = readFileSync(
  "app/(app)/dashboard/page.tsx",
  "utf8",
);
const operationsOverview = readFileSync(
  "app/(app)/dashboard/components/operations/DashboardOperationsOverview.tsx",
  "utf8",
);
const viewPreferences = readFileSync(
  "app/(app)/dashboard/hooks/useDashboardViewPreferences.ts",
  "utf8",
);
const homePage = readFileSync(
  "app/(app)/home/page.tsx",
  "utf8",
);

test("driftsvisningen bruger et separat kompakt dashboard", () => {
  assert.match(
    dashboardPage,
    /dashboardView\.isOperationsView/,
  );
  assert.match(
    dashboardPage,
    /<DashboardOperationsOverview/,
  );

  for (const label of [
    "Kommende",
    "Kræver handling",
    "Perioden i tal",
    "Genveje",
    "Fuld visning",
  ]) {
    assert.match(
      operationsOverview,
      new RegExp(label),
      `Driftsvisningen skal indeholde ${label}.`,
    );
  }
});

test("driftsvisningen gentager ikke fuld-visningens tunge elementer", () => {
  for (const label of [
    "Gem eller del overblikket",
    "Naviger i overblikket",
    "Automatiske vurderinger",
    "Datastatus",
    "Dagens drift",
    "Dagen i tal",
  ]) {
    assert.doesNotMatch(
      operationsOverview,
      new RegExp(label),
      `${label} hører ikke hjemme i Drift.`,
    );
  }

  for (const component of [
    "DashboardSnapshotActions",
    "DashboardWorkspaceNavigation",
    "DashboardAnalysisCollapsed",
  ]) {
    assert.match(
      dashboardPage,
      new RegExp(component),
      `${component} skal fortsat være bevaret i Fuld visning.`,
    );
  }
});

test("dashboard starter i Drift uden gemt eller URL-bestemt valg", () => {
  assert.match(
    viewPreferences,
    /const DEFAULT_VIEW_MODE: DashboardViewMode = "operations";/,
  );
});

test("home gentager ikke biografskiftet i Min dag-headeren", () => {
  assert.doesNotMatch(
    homePage,
    />\s*Skift biograf\s*</,
  );
  assert.match(
    homePage,
    />\s*Driftsoverblik\s*</,
  );
});
