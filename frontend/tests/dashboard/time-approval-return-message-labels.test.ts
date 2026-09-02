import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entryNotes = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalEntryNotes.tsx",
  "utf8",
);

const historyModal = readFileSync(
  "app/components/modals/time-entries/TimeEntryHistoryModal.tsx",
  "utf8",
);

test("returbesked navngives efter konteksten og den konkrete afsender", () => {
  assert.match(
    entryNotes,
    /entry\.status === "NEEDS_CHANGES"[\s\S]*?"Besked til medarbejderen:"[\s\S]*?"Note om rettelsen:"/,
  );

  assert.match(
    historyModal,
    /title: `Besked fra \$\{formatUser\([\s\S]*?revision\.changedByUser[\s\S]*?\)\}`/,
  );

  assert.doesNotMatch(
    historyModal,
    /Besked fra godkender/,
  );
});
