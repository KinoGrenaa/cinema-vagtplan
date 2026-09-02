import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const modal = readFileSync(
  "app/(app)/my-time/components/modals/MyTimeEditModal.tsx",
  "utf8",
);

test("medarbejderens redigeringsdialog viser returbesked og konkret afsender", () => {
  assert.match(
    modal,
    /editingEntry\.status === "NEEDS_CHANGES"[\s\S]*?editingEntry\.adminNote/,
  );

  assert.match(
    modal,
    /entry\.revisions\?\.\[0\]\?\.changedByUser/,
  );

  assert.match(
    modal,
    /Besked fra[\s\S]*?formatReturnMessageActor\([\s\S]*?editingEntry/,
  );

  assert.match(
    modal,
    /\{editingEntry\.adminNote\}/,
  );
});
