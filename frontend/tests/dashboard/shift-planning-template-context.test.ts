import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const dayCard = readFileSync(
  "app/(app)/shift-planning/components/month/ShiftPlanningDayCard.tsx",
  "utf8",
);

const weekIndicator = readFileSync(
  "app/(app)/shift-planning/components/month/ShiftPlanningWeekIndicator.tsx",
  "utf8",
);

test("dagskortet gør det tydeligt at skabelonen tilhører kladden", () => {
  assert.match(dayCard, /Skabelon i kladden/);
  assert.match(dayCard, /: "Ingen valgt"/);
  assert.doesNotMatch(
    dayCard,
    /\{showPlanningLayer && \([\s\S]{0,220}Skabelon\s*<\/p>/,
  );
});

test("ugeindikatoren gør skabelonstatus til kladdekontekst", () => {
  assert.match(
    weekIndicator,
    /\{daysWithTemplate\} med skabelon i kladden/,
  );
  assert.match(weekIndicator, /Skabelon til ugen/);
});
