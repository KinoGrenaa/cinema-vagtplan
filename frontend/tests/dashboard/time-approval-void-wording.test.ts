import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const actions =
  readFileSync(
    "app/(app)/time-approval/hooks/actions/useTimeApprovalActions.ts",
    "utf8",
  );

test("afvisning bruger afvist-terminologi i feedback og fejltekster", () => {
  assert.match(actions, /"Tidsregistrering afvist"/);
  assert.match(actions, /"Kunne ikke afvise tidsregistrering"/);
  assert.match(
    actions,
    /"Du skal skrive en intern note for afvisningen\."/,
  );
  assert.doesNotMatch(actions, /"Tidsregistrering annulleret"/);
  assert.doesNotMatch(actions, /Kunne ikke annullere tidsregistrering/);
});
