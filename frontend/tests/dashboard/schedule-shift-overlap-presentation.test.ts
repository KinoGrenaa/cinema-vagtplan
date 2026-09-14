import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const jobFunctionShift = readFileSync(
  "app/(app)/schedule/helpers/derived/scheduleJobFunctionShift.ts",
  "utf8",
);
const timelinePreview = readFileSync(
  "app/(app)/schedule/helpers/derived/scheduleTimelineCreationPreview.ts",
  "utf8",
);
const creationGhost = readFileSync(
  "app/(app)/schedule/components/shifts/ScheduleTimelineCreationGhost.tsx",
  "utf8",
);
const shiftForm = readFileSync(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  "utf8",
);

test("ingen dublet giver ingen positiv status eller badge", () => {
  assert.doesNotMatch(
    jobFunctionShift,
    /Ingen dubletadvarsel/,
  );
  assert.doesNotMatch(
    timelinePreview,
    /Ingen dubletadvarsel/,
  );
  assert.match(
    jobFunctionShift,
    /return null;/,
  );
  assert.match(
    timelinePreview,
    /return null;/,
  );
  assert.match(
    creationGhost,
    /\(status \|\|[\s\S]*?preview\.crossesMidnight\) &&/,
  );
  assert.doesNotMatch(
    shiftForm,
    /border-green-300 bg-green-50/,
  );
});

test("forskellige jobfunktioner må overlappe uden generisk advarsel", () => {
  assert.doesNotMatch(
    jobFunctionShift,
    /\? "Overlapper 1 eksisterende vagt"/,
  );
  assert.doesNotMatch(
    timelinePreview,
    /\? "Overlapper 1 eksisterende vagt"/,
  );
  assert.doesNotMatch(
    timelinePreview,
    /\| "overlap"/,
  );
});

test("samme jobfunktion vises som en ikke-blokerende dubletadvarsel", () => {
  assert.match(
    jobFunctionShift,
    /level: "warning" as const,[\s\S]*?Der findes allerede 1 vagt med samme jobfunktion i tidsrummet/,
  );
  assert.match(
    timelinePreview,
    /Der findes allerede 1 vagt med samme jobfunktion i tidsrummet/,
  );
  assert.match(
    creationGhost,
    /"same-work-type"[\s\S]*?border-amber-300/,
  );
  assert.doesNotMatch(
    creationGhost,
    /"same-work-type"[\s\S]{0,160}?border-red-300/,
  );
  assert.doesNotMatch(
    shiftForm,
    /timingPreviewOverlap\.level === "error"/,
  );
  assert.match(
    shiftForm,
    /timingPreviewOverlap && \([\s\S]*?border-amber-300/,
  );
});
