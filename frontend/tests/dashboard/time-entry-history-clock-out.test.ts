import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const modal =
  readFileSync(
    "app/components/modals/time-entries/TimeEntryHistoryModal.tsx",
    "utf8",
  );

test("manuel fyraften vises som en tydelig historikhændelse", () => {
  assert.match(
    modal,
    /case "CLOCK_OUT":\s*return "Fyraften registreret";/,
  );
  assert.match(
    modal,
    /case "CLOCK_OUT":\s*return "Registreret af";/,
  );
});
