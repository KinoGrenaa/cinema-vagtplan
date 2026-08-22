import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const rulesSection = readFileSync(
  "app/(app)/cinema-settings/components/payroll/CinemaSettingsPayrollRulesSection.tsx",
  "utf8",
);

test("cinema settings viser de aftalte notekrav til tidsregistrering", () => {
  assert.match(
    rulesSection,
    /Notekrav ved tidsregistrering/,
  );
  assert.match(
    rulesSection,
    /checked={cinema\.requireNoteForManualEntry}/,
  );
  assert.match(
    rulesSection,
    /requireNoteForManualEntry: event\.target\.checked/,
  );
  assert.match(
    rulesSection,
    /checked={cinema\.requireNoteForClockInDeviation}/,
  );
  assert.match(
    rulesSection,
    /requireNoteForClockInDeviation: event\.target\.checked/,
  );
  assert.match(
    rulesSection,
    /checked={cinema\.requireNoteForClockOutDeviation}/,
  );
  assert.match(
    rulesSection,
    /requireNoteForClockOutDeviation: event\.target\.checked/,
  );
});
