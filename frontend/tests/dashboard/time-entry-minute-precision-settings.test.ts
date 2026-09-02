import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const settings = readFileSync(
  "app/(app)/cinema-settings/components/sections/CinemaSettingsTimeEntryRulesSection.tsx",
  "utf8",
);
const types = readFileSync(
  "app/(app)/cinema-settings/helpers/core/cinemaSettingsTypes.ts",
  "utf8",
);
const picker = readFileSync(
  "app/components/date/ProjectTimePicker.tsx",
  "utf8",
);
const dateTimePicker = readFileSync(
  "app/components/date/ProjectDateTimePicker.tsx",
  "utf8",
);
const branding = readFileSync(
  "app/(app)/cinema-settings/components/sections/CinemaSettingsBrandingSection.tsx",
  "utf8",
);

test("registreringspræcision kan sættes til 1, 5 eller 15 minutter", () => {
  assert.match(types, /timeEntryMinuteStep: TimeEntryMinuteStep/);
  assert.match(settings, /Registreringspræcision/);
  assert.match(settings, /<option value=\{1\}>1 minut<\/option>/);
  assert.match(settings, /<option value=\{5\}>5 minutter<\/option>/);
  assert.match(settings, /<option value=\{15\}>15 minutter<\/option>/);
  assert.match(settings, /00, 15, 30 eller 45/);
});

test("fælles klokkeslætsvælgere kan bruge minutinterval uden at ændre standarden", () => {
  assert.match(picker, /minuteStep\?: ProjectTimePickerMinuteStep/);
  assert.match(picker, /minuteStep = 1/);
  assert.match(picker, /roundTimeToStep/);
  assert.match(picker, /-normalizedMinuteStep/);
  assert.match(dateTimePicker, /minuteStep=\{minuteStep\}/);
});

test("brandingteksten er ikke længere MASTER-specifik", () => {
  assert.doesNotMatch(branding, /Logoet vises for MASTER/);
  assert.match(branding, /Logoet vises i systemet/);
});
