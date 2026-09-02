import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(
  "app/(app)/my-time/components/list/MyTimeEntryCard.tsx",
  "utf8",
);

const history = readFileSync(
  "app/components/modals/time-entries/TimeEntryHistoryModal.tsx",
  "utf8",
);

const types = readFileSync(
  "app/(app)/my-time/helpers/core/myTimeTypes.ts",
  "utf8",
);

test("gammel returbesked vises ikke som aktuel note efter medarbejderens rettelse", () => {
  assert.match(
    card,
    /entry\.status === "NEEDS_CHANGES"[\s\S]*?entry\.adminNote\.trim\(\) !==[\s\S]*?entry\.revisions\?\.\[0\]\?\.newAdminNote\?\.trim\(\)/,
  );

  assert.match(
    types,
    /revisions\?: \{[\s\S]*?newAdminNote\?: string \| null;/,
  );
});

test("medarbejderens overgang fra kræver handling til afventer genbruger ikke returbeskeden som rettelsesnote", () => {
  assert.match(
    history,
    /revision\.action ===[\s\S]*?"UPDATED"[\s\S]*?revision\.previousStatus ===[\s\S]*?"NEEDS_CHANGES"[\s\S]*?revision\.newStatus ===[\s\S]*?"PENDING"[\s\S]*?return null;/,
  );
});
