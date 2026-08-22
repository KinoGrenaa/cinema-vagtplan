import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const editHook =
  readFileSync(
    "app/(app)/my-time/hooks/actions/useMyTimeEdit.ts",
    "utf8",
  );
const editModal =
  readFileSync(
    "app/(app)/my-time/components/modals/MyTimeEditModal.tsx",
    "utf8",
  );
const historyModal =
  readFileSync(
    "app/components/modals/time-entries/TimeEntryHistoryModal.tsx",
    "utf8",
  );
const approvalNotes =
  readFileSync(
    "app/(app)/time-approval/components/entry/TimeApprovalEntryNotes.tsx",
    "utf8",
  );

test("manuel registrering redigerer én samlet note uden planlagt vagt", () => {
  assert.match(
    editHook,
    /getEntrySingleNote\(entry\)/,
  );
  assert.doesNotMatch(
    editHook,
    /!editingEntry\.shift && !editNote\.trim\(\)/,
  );
  assert.match(
    editHook,
    /note:\s*editNote\.trim\(\) \|\| null/,
  );
  assert.match(
    editModal,
    /!editingEntry\.shift \? \(/,
  );
  assert.match(
    editModal,
    /Note \/ begrundelse/,
  );
});

test("historik og adminvisning prioriterer den generelle manuelle note", () => {
  assert.match(
    historyModal,
    /revision\.previousNote/,
  );
  assert.match(
    historyModal,
    /label="Note \/ begrundelse"/,
  );
  assert.match(
    approvalNotes,
    /entry\.note \|\| entry\.clockInNote/,
  );
});
