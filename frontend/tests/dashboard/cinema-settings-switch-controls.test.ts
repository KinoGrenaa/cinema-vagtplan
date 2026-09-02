import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const switchControl = readFileSync(
  "app/(app)/cinema-settings/components/layout/CinemaSettingsSwitch.tsx",
  "utf8",
);
const booleanSections = [
  "app/(app)/cinema-settings/components/sections/CinemaSettingsFeatureTogglesSection.tsx",
  "app/(app)/cinema-settings/components/sections/CinemaSettingsStaffingWarningsSection.tsx",
  "app/(app)/cinema-settings/components/sections/CinemaSettingsTimeRegistrationSection.tsx",
  "app/(app)/cinema-settings/components/sections/CinemaSettingsTimeEntryRulesSection.tsx",
  "app/(app)/cinema-settings/components/payroll/CinemaSettingsPayrollRulesSection.tsx",
].map((path) => readFileSync(path, "utf8"));
const advancedPayRules = readFileSync(
  "app/(app)/cinema-settings/components/payroll/CinemaSettingsAdvancedPayRulesSection.tsx",
  "utf8",
);

test("biografindstillinger har én fælles slider til ja/nej-valg", () => {
  assert.match(switchControl, /type="checkbox"/);
  assert.match(switchControl, /className="peer sr-only"/);
  assert.match(switchControl, /peer-checked:bg-blue-600/);
  assert.match(switchControl, /peer-checked:translate-x-5/);
  assert.match(switchControl, /peer-focus-visible:ring-2/);
  assert.match(switchControl, /aria-label={ariaLabel}/);
});

test("hovedsidens binære indstillinger bruger slideren i stedet for rå checkbokse og statusknapper", () => {
  for (const section of booleanSections) {
    assert.match(section, /CinemaSettingsSwitch/);
    assert.doesNotMatch(section, /type="checkbox"/);
    assert.doesNotMatch(section, /aria-pressed=/);
  }
});

test("egentlige flervalg som ugedage bevarer checkbokse", () => {
  assert.match(advancedPayRules, /type="checkbox"/);
  assert.match(advancedPayRules, /Ugedage/);
});
