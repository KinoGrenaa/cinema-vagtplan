import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  "utf8",
);

test("eksisterende vagt viser jobfunktion som read-only felt uden select", () => {
  assert.match(
    source,
    /\{selectedShift \? \(\s*<div className="min-w-0 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">/,
  );
  assert.match(
    source,
    /jobFunctions\.find\([\s\S]*jobFunction\.id ===[\s\S]*jobFunctionId,[\s\S]*\)\?\.name \?\?[\s\S]*"Ukendt jobfunktion"/,
  );
});

test("ny vagt beholder aktiv jobfunktion-dropdown", () => {
  assert.match(
    source,
    /\) : \(\s*<select\s+className=\{inputClass\}\s+value=\{jobFunctionId\}/,
  );
  assert.match(
    source,
    /setJobFunctionId\(/,
  );
});

test("disabled jobfunktion-dropdown er fjernet fra eksisterende vagt", () => {
  assert.doesNotMatch(
    source,
    /disabled=\{\s*Boolean\(\s*selectedShift,?\s*\)\s*\}/,
  );
});

test("jobfunktion og medarbejder bruger samme read-only farvefamilie", () => {
  const marker =
    "border-gray-200 bg-gray-100 px-3 py-2 text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400";
  assert.ok(
    source.split(marker).length - 1 >= 2,
  );
});
