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

test("oprettelseshistorik viser tidsregistreringens note og begrundelse", () => {
  assert.match(
    modal,
    /previousNote\?:/,
  );
  assert.match(
    modal,
    /newNote\?:/,
  );
  assert.match(
    modal,
    /revision\.newNote/,
  );
  assert.match(
    modal,
    /Note \/ begrundelse/,
  );
});
