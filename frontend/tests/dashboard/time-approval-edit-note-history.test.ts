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

test("rettelsesnoten bruger samme begreb på registreringskort og i historik", () => {
  assert.match(entryNotes, /Note om rettelsen:/);
  assert.doesNotMatch(entryNotes, /Admin note:/);

  assert.match(
    historyModal,
    /revision\.action ===\s*"UPDATED"[\s\S]*?title:\s*"Note om rettelsen"/,
  );

  assert.match(
    historyModal,
    /revision\.newAdminNote \|\|\s*revision\.reason/,
  );
});
