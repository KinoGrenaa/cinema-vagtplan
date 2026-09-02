import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const operations = readFileSync(
  "app/(app)/dashboard/components/operations/DashboardOperationsOverview.tsx",
  "utf8",
);
const horizonHelper = readFileSync(
  "app/(app)/dashboard/helpers/dashboardOperationsHorizon.ts",
  "utf8",
);
const horizonService = readFileSync(
  "app/(app)/dashboard/services/dashboardOperationsService.ts",
  "utf8",
);
const horizonHook = readFileSync(
  "app/(app)/dashboard/hooks/useDashboardOperationsHorizon.ts",
  "utf8",
);
const warningHistoryModal = readFileSync(
  "app/(app)/dashboard/components/operations/DashboardWarningHistoryModal.tsx",
  "utf8",
);

test("driftsdashboardets standardhorisont er 10 dage og kan sættes til 1-30", () => {
  assert.match(horizonHelper, /DEFAULT_DASHBOARD_HORIZON_DAYS = 10/);
  assert.match(horizonHelper, /MIN_DASHBOARD_HORIZON_DAYS = 1/);
  assert.match(horizonHelper, /MAX_DASHBOARD_HORIZON_DAYS = 30/);
  assert.match(operations, /Vis næste/);
  assert.match(operations, /horizon\.savingPreference/);
  assert.match(operations, /"Gemmer\.\.\."/);
  assert.match(operations, /"Gem"/);
});

test("driftsdashboardet henter vagter, film, biografregel og advarselsbeslutninger", () => {
  assert.match(horizonService, /\/shifts\/range\?/);
  assert.match(horizonService, /\/movie-showings\/range\?/);
  assert.match(horizonService, /staffingLoadWarningEnabled/);
  assert.match(horizonService, /dashboard-warning-decisions/);
});

test("belastningsadvarslen bruger kun biografens egne grænser og giver én advarsel pr. dato", () => {
  assert.match(horizonHelper, /settings\.minSoldSeats/);
  assert.match(horizonHelper, /settings\.maxTicketsPerEmployee/);
  assert.match(horizonHelper, /STAFFING_LOAD:/);
  assert.match(horizonHelper, /new Set\(/);
  assert.match(horizonHelper, /assignedEmployeeIds\.size/);
  assert.doesNotMatch(horizonHelper, />= 150/);
  assert.doesNotMatch(horizonHelper, />= 60/);
});

test("ubemandede vagter og belastning kan ignoreres og genåbnes", () => {
  assert.match(horizonHelper, /UNASSIGNED_SHIFT:/);
  assert.match(operations, /Ignorer/);
  assert.match(operations, /Genåbn/);
  assert.match(operations, /Vis ignorerede/);
  assert.match(horizonHook, /recordWarningDecision/);
  assert.match(horizonService, /saveDashboardWarningDecision/);
});


test("kræver handling er kompakt og viser detaljer efter klik", () => {
  assert.match(operations, /summarizeWarningGroup/);
  assert.match(operations, /aria-expanded=\{expanded\}/);
  assert.match(operations, /expandedWarningGroup/);
  assert.match(operations, /1 \? "ubemandet vagt" : "ubemandede vagter"/);
  assert.match(operations, /loadWarning\?\.summary/);
  assert.match(operations, /\{expanded \? "Skjul" : "Vis"\}/);
  assert.doesNotMatch(operations, /grid gap-3 lg:grid-cols-2/);
});

test("belastningsadvarsler har en kort oversigt til den kompakte dagsrække", () => {
  assert.match(horizonHelper, /summary: `\$\{soldSeats\} billetter · \$\{assignedEmployeeCount\}/);
  assert.match(horizonHelper, /summary: start && end/);
});

test("ignorerede advarsler bliver på deres oprindelige dag", () => {
  assert.match(
    operations,
    /groupWarningsByDate\(allWarnings, latestDecisions, showIgnored\)/,
  );
  assert.match(operations, /ignoredCount === 1 \? "ignoreret" : "ignorerede"/);
  assert.match(operations, /\{ignored \? "Genåbn" : "Ignorer"\}/);
  assert.doesNotMatch(operations, />\s*Ignorerede advarsler\s*</);
  assert.doesNotMatch(operations, /ignoredGroups/);
});

test("historik vises kun på advarsler der faktisk har beslutningshistorik", () => {
  assert.match(operations, /getDecisionHistoryMap/);
  assert.match(operations, /const history = decisionHistory\.get\(warning\.key\) \?\? \[\]/);
  assert.match(operations, /\{history\.length > 0 \? \(/);
  assert.match(operations, /Historik \(\{history\.length\}\)/);
  assert.match(operations, /setHistoryWarning\(warning\)/);
  assert.match(operations, /<DashboardWarningHistoryModal/);
});

test("advarselshistorikken viser handling, person, tidspunkt og begrundelse", () => {
  assert.match(warningHistoryModal, /const history = \[\.\.\.decisions\]\.reverse\(\)/);
  assert.match(warningHistoryModal, /action === "IGNORED" \? "Ignoreret" : "Genåbnet"/);
  assert.match(warningHistoryModal, /decision\.user\.firstName/);
  assert.match(warningHistoryModal, /decisionTimestampFormatter/);
  assert.match(warningHistoryModal, /Begrundelse: \$\{decision\.note\}/);
  assert.match(warningHistoryModal, /Ingen begrundelse angivet\./);
  assert.doesNotMatch(operations, /Ignoreret af \{decision\.user\.firstName\}/);
});
