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
