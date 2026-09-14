import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  "utf8",
);

test("medarbejdernavnet er visuelt read-only på eksisterende vagter", () => {
  assert.match(
    source,
    /selectedShift\s*\?\s*"min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"/,
  );
});

test("medarbejderfeltet beholder aktiv præsentation ved oprettelse", () => {
  assert.match(
    source,
    /:\s*"min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"/,
  );
});

test("medarbejderen ændres fortsat via den særskilte handling", () => {
  assert.match(
    source,
    /\? "Skift medarbejder"\s*:\s*"Vælg medarbejder"/,
  );
  assert.match(
    source,
    /setEmployeePickerOpen\(\s*true,?\s*\)/,
  );
});
