import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/(app)/cinema-settings/page.tsx", "utf8");
const section = readFileSync(
  "app/(app)/cinema-settings/components/sections/CinemaSettingsStaffingWarningsSection.tsx",
  "utf8",
);
const types = readFileSync(
  "app/(app)/cinema-settings/helpers/core/cinemaSettingsTypes.ts",
  "utf8",
);
const analytics = readFileSync(
  "app/(app)/dashboard/helpers/dashboardAnalytics.ts",
  "utf8",
);

test("biografindstillinger har et særskilt område til bemanding og drift", () => {
  assert.match(page, /Bemanding og drift/);
  assert.match(page, /CinemaSettingsStaffingWarningsSection/);
});

test("biografen kan aktivere og definere sin egen belastningsregel", () => {
  assert.match(section, /Belastningsadvarsler/);
  assert.match(section, /Aktivér belastningsadvarsler/);
  assert.match(section, /Minimum solgte billetter/);
  assert.match(section, /Maks\. solgte billetter pr\. tildelt medarbejder/);
  assert.match(
    section,
    /Aktivér belastningsadvarsler for at vælge biografens grænser\./,
  );
  assert.match(section, /\{enabled \? \(/);
  assert.match(
    section,
    /<\/div>\s*<CinemaSettingsSwitch\s+checked=\{enabled\}/,
  );
  assert.doesNotMatch(
    section,
    /flex items-center gap-3 rounded-xl[\s\S]*Aktivér belastningsadvarsler/,
  );
  assert.doesNotMatch(section, /Maks\. billetter pr\. planlagt medarbejder/);
  assert.equal((section.match(/type="text"/g) ?? []).length, 2);
  assert.equal((section.match(/inputMode="numeric"/g) ?? []).length, 2);
  assert.equal((section.match(/pattern="\[0-9\]\*"/g) ?? []).length, 2);
  assert.doesNotMatch(section, /type="number"/);
  assert.match(section, /nextValue === "" \|\| \/\^\\d\+\$\//);
  assert.match(types, /staffingLoadWarningEnabled/);
  assert.match(types, /staffingLoadWarningMinSoldSeats/);
  assert.match(types, /staffingLoadWarningMaxTicketsPerEmployee/);
});

test("de gamle 150 og 60 tærskler er ikke længere hardkodede som dashboardadvarsler", () => {
  assert.doesNotMatch(analytics, /totalSoldSeats >= 150/);
  assert.doesNotMatch(analytics, /averageLoad >= 60/);
  assert.doesNotMatch(analytics, /Høj belastning pr medarbejder/);
});
