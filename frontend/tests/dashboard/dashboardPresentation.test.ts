import assert from "node:assert/strict";
import test from "node:test";

import { formatHours } from "../../app/(app)/dashboard/helpers/dashboardHelpers";
import {
  cleanDashboardInsight,
  formatDashboardCount,
} from "../../app/(app)/dashboard/helpers/dashboardPresentation";

test("automatiske markører fjernes fra eksport- og rapporttekst", () => {
  assert.equal(cleanDashboardInsight("🤖 Kontrollér bemandingen"), "Kontrollér bemandingen");
  assert.equal(cleanDashboardInsight("🚨  Kritisk belastning  "), "Kritisk belastning");
  assert.equal(cleanDashboardInsight("Almindelig tekst"), "Almindelig tekst");
});

test("danske tællere bruger korrekt ental og flertal", () => {
  assert.equal(formatDashboardCount(1, "vagt", "vagter"), "1 vagt");
  assert.equal(formatDashboardCount(0, "vagt", "vagter"), "0 vagter");
  assert.equal(formatDashboardCount(2, "vagt", "vagter"), "2 vagter");
});

test("timer formateres med to danske decimaler", () => {
  assert.match(formatHours(7.5), /^7(?:[.,])50$/);
  assert.match(formatHours(0), /^0(?:[.,])00$/);
});
