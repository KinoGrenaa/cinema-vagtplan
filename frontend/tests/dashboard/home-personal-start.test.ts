import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const homePage = readFileSync(
  "app/(app)/home/page.tsx",
  "utf8",
);

const startOverview = readFileSync(
  "app/components/cinema/cinemaStartOverview.ts",
  "utf8",
);

test("home er en personlig Min dag-startside", () => {
  assert.match(
    homePage,
    />\s*Min dag\s*</,
  );
  assert.match(
    homePage,
    />\s*Lige nu\s*</,
  );
  assert.match(
    homePage,
    />\s*Kræver handling\s*</,
  );
  assert.match(
    homePage,
    />\s*Kommende\s*</,
  );
  assert.doesNotMatch(
    homePage,
    /Dine næste 5 vagter/,
  );
});

test("home fremhæver åben tidsregistrering", () => {
  assert.match(
    homePage,
    /fetchCinemaStartOpenTimeEntry\(user\.id\)/,
  );
  assert.match(
    homePage,
    /Åben tidsregistrering/,
  );
  assert.match(
    homePage,
    /Registrer fyraften/,
  );
  assert.match(
    startOverview,
    /\/time-entries\/open\?userId=\$\{userId\}/,
  );
});

test("driftsoverblik vises kun for administrator", () => {
  assert.match(
    homePage,
    /activeCinema\.role === "ADMIN"/,
  );
  assert.match(
    homePage,
    />\s*Driftsoverblik\s*</,
  );
  assert.match(
    homePage,
    /href="\/dashboard"/,
  );
});

test("global MASTER beholder dashboard som startpunkt", () => {
  assert.match(
    startOverview,
    /overview\.mode === "MASTER"\) return "\/dashboard"/,
  );
});


test("home har kompakte genveje til daglige medarbejderområder", () => {
  for (const label of [
    "Se vagtplan",
    "Mine vagter",
    "Mine timer",
    "Fravær",
    "Beskeder",
  ]) {
    assert.match(homePage, new RegExp(`>\\s*${label}\\s*<`));
  }
});

test("tom startside undgår dobbelt tom kommende-sektion", () => {
  assert.match(
    homePage,
    /Ingen vagt i dag/,
  );
  assert.match(
    homePage,
    /\{upcomingShifts\.length > 0 \? \(/,
  );
  assert.doesNotMatch(
    homePage,
    /Ingen yderligere vagter er planlagt lige nu/,
  );
});
