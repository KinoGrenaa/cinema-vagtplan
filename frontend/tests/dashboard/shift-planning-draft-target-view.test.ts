import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page = readFileSync(
  "app/(app)/shift-planning/page.tsx",
  "utf8",
);

const dayCard = readFileSync(
  "app/(app)/shift-planning/components/month/ShiftPlanningDayCard.tsx",
  "utf8",
);

const types = readFileSync(
  "app/(app)/shift-planning/helpers/shiftPlanningTypes.ts",
  "utf8",
);

test("kladdevisningen viser den nuværende vagtplan samtidig med målplanen", () => {
  assert.match(types, /isPlanningCreated: boolean/);
  assert.match(
    page,
    /const visibleScheduledShifts = allScheduledShifts;/,
  );
  assert.match(page, /scheduledShifts: visibleScheduledShifts/);
  assert.match(dayCard, /Nuværende vagtplan ·/);
  assert.match(dayCard, /Kladde ·/);
});

test("Samme som nu kræver samme medarbejder og matcher kun én eksisterende vagt", () => {
  assert.match(types, /matchesExistingShift\?: boolean/);
  assert.match(
    page,
    /shift\.userId === item\.userId/,
  );
  assert.match(
    page,
    /remainingPlanningCreatedShifts\.splice\(matchingShiftIndex, 1\)/,
  );
  assert.match(
    dayCard,
    /item\.matchesExistingShift[\s\S]{0,180}label: "Samme som nu"/,
  );
});

test("ændret medarbejder på samme planlægningsvagt vises som Ændres ved Erstat", () => {
  assert.match(types, /changesPlanningCreatedShift\?: boolean/);
  assert.match(
    page,
    /workingPreviewItemsWithExactMatches[\s\S]*changesPlanningCreatedShift: true/,
  );
  assert.match(
    dayCard,
    /item\.changesPlanningCreatedShift[\s\S]{0,180}label: "Ændres ved Erstat"/,
  );
});
