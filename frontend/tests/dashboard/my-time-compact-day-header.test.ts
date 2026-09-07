import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(
  "app/(app)/my-time/components/layout/MyTimeHeader.tsx",
  "utf8",
);
const dayGroups = readFileSync(
  "app/(app)/my-time/components/list/MyTimeDayGroupsSection.tsx",
  "utf8",
);

test("my-time fremhæver vagtplansgenvejen og holder filter sekundært", () => {
  assert.match(header, /href="\/schedule"[\s\S]*bg-blue-600[\s\S]*Se vagtplan/);
  assert.match(header, /onClick=\{onOpenFilterModal\}[\s\S]*border-gray-300[\s\S]*Filter/);
});

test("my-time viser dagsbadges på samme linje som datoen", () => {
  assert.match(dayGroups, /flex min-w-0 flex-wrap items-center gap-2/);
  assert.doesNotMatch(dayGroups, /mt-2 flex flex-wrap gap-2/);
});

test("my-time viser antal afvigelser allerede på dagsrækken", () => {
  assert.match(dayGroups, /hasPlannedTimeDeviation\(entry, minuteStep\)/);
  assert.match(dayGroups, /Afvigelse: \$\{deviationCount\}/);
  assert.match(dayGroups, /part\.startsWith\("Afvigelse:"\)/);
});
