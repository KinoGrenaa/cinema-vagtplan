import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(path, "utf8");

const page = read(
  "app/(app)/my-shifts/page.tsx",
);
const list = read(
  "app/(app)/my-shifts/components/list/MyShiftsListSection.tsx",
);
const monthControls = read(
  "app/(app)/my-shifts/components/layout/MyShiftsMonthControls.tsx",
);
const header = read(
  "app/(app)/my-shifts/components/layout/MyShiftsHeader.tsx",
);
const dataHook = read(
  "app/(app)/my-shifts/hooks/data/useMyShiftsData.ts",
);

test("my-shifts fokuserer på hvornår medarbejderen skal arbejde", () => {
  assert.match(
    header,
    /Se dine planlagte vagter\./,
  );
  assert.doesNotMatch(
    page,
    /Samlet timer/,
  );
  assert.doesNotMatch(
    page,
    /totalHours/,
  );
  assert.doesNotMatch(
    dataHook,
    /const totalHours/,
  );
});

test("my-shifts skjuler afsluttede vagter som standard", () => {
  assert.match(
    list,
    /showCompletedShifts/,
  );
  assert.match(
    list,
    /new Date\(\s*shift\.endTime,\s*\)\.getTime\(\) <= now/,
  );
  assert.match(
    list,
    /endTime > now/,
  );
  assert.match(
    list,
    /Vis afsluttede vagter/,
  );
  assert.match(
    list,
    /60_000/,
  );
});

test("my-shifts grupperer vagter efter københavnsk dato", () => {
  assert.match(
    list,
    /groupShiftsByDay/,
  );
  assert.match(
    list,
    /dateToLocalDateString/,
  );
  assert.match(
    list,
    /shiftDayGroups\.map/,
  );
});

test("my-shifts viser arbejdstid som timer og minutter", () => {
  assert.match(
    list,
    /formatShiftDuration/,
  );
  assert.match(
    list,
    /return `\$\{hours\} t \$\{minutes\} min`/,
  );
  assert.match(
    list,
    /formatShiftTimeSummary/,
  );
  assert.doesNotMatch(
    list,
    /\.toFixed\(2\)/,
  );
});

test("my-shifts viser måneden med dansk navn", () => {
  assert.match(
    monthControls,
    /formatMonthLabel/,
  );
  assert.match(
    monthControls,
    /month: "long"/,
  );
  assert.match(
    monthControls,
    /year: "numeric"/,
  );
  assert.doesNotMatch(
    monthControls,
    />\s*\{selectedMonth\}\s*</,
  );
});

test("my-shifts viser planlagt tid eksplicit", () => {
  assert.match(
    list,
    />\s*Planlagt:\s*</,
  );
  assert.match(
    list,
    /formatShiftTimeSummary/,
  );
});

test("my-shifts samler hver dato som en tydelig dagsblok", () => {
  assert.match(
    list,
    /overflow-hidden rounded-2xl border border-gray-200/,
  );
  assert.match(
    list,
    /divide-y divide-gray-200/,
  );
  assert.doesNotMatch(
    list,
    /font-bold capitalize text-gray-700/,
  );
  assert.match(
    list,
    /toLocaleUpperCase\(\s*"da-DK"/,
  );
});

test("my-shifts nedtoner vagtbyttehandlinger i forhold til selve vagten", () => {
  assert.match(
    list,
    /border border-blue-300 bg-blue-50 px-3 py-1\.5 text-xs/,
  );
  assert.match(
    list,
    /lg:flex-row lg:items-center lg:justify-between/,
  );
  assert.match(
    list,
    /h-10 w-1 shrink-0 rounded-full bg-blue-500/,
  );
});

test("my-shifts bruger den fælles søgbare medarbejdervælger til direkte vagt", () => {
  assert.match(
    list,
    /EmployeePickerModal/,
  );
  assert.match(
    list,
    /title="Send vagt direkte til kollega"/,
  );
  assert.match(
    list,
    /confirmLabel="Send vagt"/,
  );
  assert.match(
    list,
    /setDirectTradeShiftId/,
  );
  assert.doesNotMatch(
    list,
    /<select[\s\S]{0,1200}Send direkte til kollega/,
  );
});

test("my-shifts sender kollegaens profilbillede til medarbejdervælgeren", () => {
  assert.match(
    list,
    /profileImage:\s*user\.profileImage\s*\?\?\s*null/,
  );
});
