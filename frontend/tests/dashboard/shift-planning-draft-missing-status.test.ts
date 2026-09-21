import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const helpers = readFileSync(
  "app/(app)/shift-planning/helpers/shiftPlanningHelpers.ts",
  "utf8",
);

const dayCard = readFileSync(
  "app/(app)/shift-planning/components/month/ShiftPlanningDayCard.tsx",
  "utf8",
);

test("kladdevisningen tæller en fremtidig aktiv dag uden skabelon som manglende planlægning selv med faktiske vagter", () => {
  assert.match(
    helpers,
    /export function isDraftPlanningMissing\(day: MonthPlanDay\)[\s\S]*?!day\.scheduleTemplateId[\s\S]*?!isPastDate/,
  );
  assert.match(
    helpers,
    /const missingTemplateDays = weekDays\.filter\([\s\S]*?isDraftPlanningMissing\(day\)/,
  );
});

test("dagskortets kladdestatus kan vise manglende planlægning uden at skjule de faktiske vagter", () => {
  assert.match(
    dayCard,
    /showPlanningLayer && isDraftPlanningMissing\(day\)/,
  );
  assert.match(
    dayCard,
    /scheduledShiftCount: 0,[\s\S]*?scheduledShifts: \[\]/,
  );
  assert.match(
    dayCard,
    /const scheduledShifts = day\.scheduledShifts \?\? \[\]/,
  );
});
