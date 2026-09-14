import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  "utf8",
);

test("Skift medarbejder skjuler den medarbejder der allerede har vagten", () => {
  assert.match(
    source,
    /const originalAssignedUserId =[\s\S]*selectedShift\.userId[\s\S]*const selectableQualifiedUsers =[\s\S]*qualifiedUsers\.filter\([\s\S]*user\.id !==[\s\S]*originalAssignedUserId/,
  );
});

test("ny vagt beholder alle kvalificerede medarbejdere", () => {
  assert.match(
    source,
    /const selectableQualifiedUsers =[\s\S]*selectedShift[\s\S]*\?[\s\S]*qualifiedUsers\.filter\([\s\S]*:[\s\S]*qualifiedUsers/,
  );
});

test("et nyt endnu ikke gemt medarbejdervalg kan fortsat vises som valgt", () => {
  assert.match(
    source,
    /selectedEmployeeId=\{[\s\S]*selectedShift[\s\S]*selectedShift\.userId[\s\S]*=== userId[\s\S]*\? null[\s\S]*: userId > 0[\s\S]*\? userId/,
  );
});

test("fallback må ikke genindsætte den oprindelige medarbejder", () => {
  assert.match(
    source,
    /const currentUser =[\s\S]*user\.id === userId &&[\s\S]*user\.id !==[\s\S]*originalAssignedUserId/,
  );
});
