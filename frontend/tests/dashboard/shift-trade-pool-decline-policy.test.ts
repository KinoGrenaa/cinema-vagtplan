import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(
    relativePath,
    "utf8",
  );
}

test("vagtpuljen giver medarbejderen mulighed for at takke nej", () => {
  const page = read(
    "app/(app)/shift-trades/page.tsx",
  );
  const poolSectionStart =
    page.indexOf(
      'title="Åbne vagter i puljen"',
    );

  assert.ok(
    poolSectionStart >= 0,
  );
  const poolSection =
    page.slice(
      poolSectionStart,
      poolSectionStart + 1200,
    );

  assert.match(
    poolSection,
    /onReject=\{\s*rejectTrade\s*\}/,
  );
});

test("medarbejdersproget er Tak nej og ikke Afvis vagt", () => {
  const actions = read(
    "app/(app)/shift-trades/hooks/actions/useShiftTradeActions.ts",
  );

  assert.match(
    actions,
    /Tak nej til vagten\?/,
  );
  assert.match(
    actions,
    /Vil du takke nej til denne vagt\?/,
  );
  assert.match(
    actions,
    /Du har takket nej til vagten\./,
  );
});

test("acceptdialogen holder hele afsendernavnet samlet", () => {
  const actions = read(
    "app/(app)/shift-trades/hooks/actions/useShiftTradeActions.ts",
  );

  assert.match(
    actions,
    /trade\.offeredByUser\.firstName\} \$\{trade\.offeredByUser\.lastName\}/,
  );
  assert.match(
    actions,
    /\.trim\(\)\s*\.replaceAll\(" ", "\\u00A0"\)/,
  );
});

test("accept og Tak nej bruger samme kompakte vagtformat med ugedag", () => {
  const actions = read(
    "app/(app)/shift-trades/hooks/actions/useShiftTradeActions.ts",
  );
  const helpers = read(
    "app/(app)/shift-trades/helpers/core/shiftTradeHelpers.ts",
  );

  assert.match(
    helpers,
    /export function formatShiftDialogDate/,
  );
  assert.match(
    helpers,
    /weekday: "long"/,
  );
  assert.match(
    helpers,
    /month: "2-digit"/,
  );
  assert.match(
    actions,
    /formatShiftDialogDate\(/,
  );
  assert.match(
    actions,
    /getTradeJobFunctionName\(trade\)\}\\n/,
  );
  assert.match(
    actions,
    /formatShiftDialogTime\(/,
  );
});

test("afsenderen kan se hvem der har svaret og hvem der stadig mangler", () => {
  const list = read(
    "app/(app)/my-shifts/components/list/MyShiftsListSection.tsx",
  );

  assert.match(
    list,
    /Vagten er stadig ubemandet/,
  );
  assert.match(
    list,
    /Alle kvalificerede kolleger har takket nej\./,
  );
  assert.match(
    list,
    /border-red-300 bg-red-50/,
  );
  assert.match(
    list,
    /Takket nej:/,
  );
  assert.match(
    list,
    /Afventer:/,
  );
  assert.match(
    list,
    /mangler at svare/,
  );
});
