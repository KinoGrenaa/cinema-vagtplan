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

test("matchende planlægningsvagt markeres som samme som nu i kladden", () => {
  assert.match(types, /replacesPlanningCreatedShift\?: boolean/);
  assert.match(
    page,
    /planningCreatedShiftIdentities\.has\(identity\)[\s\S]{0,120}replacesPlanningCreatedShift: true/,
  );
  assert.match(
    dayCard,
    /item\.replacesPlanningCreatedShift[\s\S]{0,180}label: "Samme som nu"/,
  );
});
