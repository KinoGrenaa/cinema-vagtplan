import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const shiftForm = readFileSync(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  "utf8",
);

test("vagt med tidsregistrering vises som låst i schedule-modal", () => {
  assert.match(
    shiftForm,
    /shiftLockedByTimeEntry/,
  );
  assert.match(
    shiftForm,
    /Vagten kan ikke ændres, fordi der findes en tidsregistrering./,
  );
  assert.match(
    shiftForm,
    /!shiftLockedByTimeEntry/,
  );
  assert.match(
    shiftForm,
    /shiftLockedByTimeEntry \? "Luk" : "Annuller"/,
  );
  assert.equal(
    shiftForm.includes(") : null})"),
    false,
  );
});
