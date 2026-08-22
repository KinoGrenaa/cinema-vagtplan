import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page =
  readFileSync(
    "app/(app)/absence-calendar/page.tsx",
    "utf8",
  );


const header =
  readFileSync(
    "app/(app)/absence-calendar/components/layout/AbsenceCalendarHeader.tsx",
    "utf8",
  );

const hook =
  readFileSync(
    "app/(app)/absence-calendar/hooks/data/useAbsenceCalendarData.ts",
    "utf8",
  );

test("fraværskalenderen henter alle medarbejderes aktive fravær for den valgte måned", () => {
  assert.match(
    page,
    /useAbsenceCalendarData\(\s*selectedMonth,?\s*\)/,
  );

  assert.match(
    hook,
    /includeAll:\s*"true"/,
  );
  assert.match(
    hook,
    /statuses:\s*"PENDING,APPROVED"/,
  );
  assert.match(
    hook,
    /startDate/,
  );
  assert.match(
    hook,
    /endDate/,
  );
});

test("fraværskalenderen bruger den paginerede endpoint og fortsætter over 100 poster", () => {
  assert.match(
    hook,
    /ABSENCE_CALENDAR_PAGE_SIZE\s*=\s*100/,
  );
  assert.match(
    hook,
    /\/leave-requests\/page\?/,
  );
  assert.match(
    hook,
    /beforeId/,
  );
  assert.match(
    hook,
    /data\?\.hasMore/,
  );
  assert.match(
    hook,
    /seenCursors/,
  );
});

test("månedsskift kan ikke overskrives af et ældre fetch-resultat", () => {
  assert.match(
    hook,
    /fetchSequenceRef/,
  );
  assert.match(
    hook,
    /fetchSequence !==\s*fetchSequenceRef\.current/,
  );
});

test("fraværskalenderen opdaterer automatisk mens siden er åben og ved tilbagevenden til fanen", () => {
  assert.match(
    hook,
    /ABSENCE_CALENDAR_REFRESH_INTERVAL_MS\s*=\s*30_000/,
  );
  assert.match(
    hook,
    /window\.setInterval\(/,
  );
  assert.match(
    hook,
    /document\.visibilityState\s*!==\s*"visible"/,
  );
  assert.match(
    hook,
    /window\.addEventListener\(\s*"focus"/,
  );
  assert.match(
    hook,
    /document\.addEventListener\(\s*"visibilitychange"/,
  );
  assert.match(
    hook,
    /window\.clearInterval\(/,
  );
  assert.match(
    hook,
    /window\.removeEventListener\(\s*"focus"/,
  );
  assert.match(
    hook,
    /document\.removeEventListener\(\s*"visibilitychange"/,
  );
});

test("fraværskalenderens genvej til aktuel måned hedder I dag", () => {
  assert.ok(
    header.includes(
      "I dag",
    ),
  );
  assert.equal(
    header.includes(
      "Gå til denne måned",
    ),
    false,
  );
});
