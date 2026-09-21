import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const page = fs.readFileSync(
  path.resolve(process.cwd(), "app/(app)/shift-planning/page.tsx"),
  "utf8",
);

const card = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/(app)/shift-planning/components/month/ShiftPlanningDayCard.tsx",
  ),
  "utf8",
);

const types = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/(app)/shift-planning/helpers/shiftPlanningTypes.ts",
  ),
  "utf8",
);

test("Samme som nu matcher alle faktiske vagter 1:1, også manuelle vagter", () => {
  assert.match(
    page,
    /remainingExactScheduledShifts\s*=\s*selectedDraftId\s*===\s*null\s*\?\s*\[\]\s*:\s*\[\.\.\.allScheduledShifts\]/,
  );

  assert.match(
    page,
    /shift\.jobFunctionId\s*===\s*item\.jobFunctionId/,
  );

  assert.match(
    page,
    /shift\.userId\s*===\s*item\.userId/,
  );

  assert.match(
    page,
    /new Date\(shift\.startTime\)\.getTime\(\)\s*===\s*itemStart/,
  );

  assert.match(
    page,
    /new Date\(shift\.endTime\)\.getTime\(\)\s*===\s*itemEnd/,
  );

  assert.match(
    page,
    /matchesExistingShift:\s*true/,
  );

  assert.match(
    card,
    /item\.matchesExistingShift/,
  );

  assert.match(
    types,
    /matchesExistingShift\?:\s*boolean/,
  );
});

test("Ændres ved Erstat bruger fortsat kun planlægningsoprettede vagter", () => {
  assert.match(
    page,
    /allScheduledShifts\.filter\(\(shift\)\s*=>\s*shift\.isPlanningCreated\)/,
  );

  assert.match(
    page,
    /remainingPlanningCreatedShifts/,
  );

  assert.match(
    page,
    /changesPlanningCreatedShift:\s*true/,
  );
});
