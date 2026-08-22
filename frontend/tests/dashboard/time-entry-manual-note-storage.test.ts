import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const notes =
  readFileSync(
    "app/(app)/my-time/helpers/core/myTimeNotes.ts",
    "utf8",
  );
const scheduleHook =
  readFileSync(
    "app/(app)/schedule/hooks/actions/useScheduleTimeRegistration.ts",
    "utf8",
  );

test("manuel registrering uden vagt kan vise en ren generel note uden clock-noter", () => {
  assert.match(
    notes,
    /const note = entry\.note\?\.trim\(\) \|\| "";/,
  );
  assert.match(
    notes,
    /note\.length > 0/,
  );
  assert.match(
    notes,
    /if \(entry\.shift\) return false;/,
  );
});

test("manuel registrering på schedule hardcoder ikke notekravet", () => {
  assert.doesNotMatch(
    scheduleHook,
    /if \(!manualNote\.trim\(\)\)/,
  );
  assert.match(
    scheduleHook,
    /note: manualNote\.trim\(\)/,
  );
});
