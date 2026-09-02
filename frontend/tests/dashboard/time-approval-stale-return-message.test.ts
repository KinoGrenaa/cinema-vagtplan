import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notes = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalEntryNotes.tsx",
  "utf8",
);

const types = readFileSync(
  "app/(app)/time-approval/types.ts",
  "utf8",
);

test("time approval skjuler kun en gammel returbesked som aktuel adminnote", () => {
  assert.match(
    types,
    /revisions\?: \{[\s\S]*?newAdminNote\?: string \| null;/,
  );

  assert.match(
    notes,
    /const latestReturnMessage =[\s\S]*?entry\.revisions\?\.\[0\]\?\.newAdminNote\?\.trim\(\)/,
  );

  assert.match(
    notes,
    /entry\.status === "NEEDS_CHANGES"[\s\S]*?!latestReturnMessage[\s\S]*?currentAdminNote !== latestReturnMessage/,
  );

  assert.match(
    notes,
    /\{showAdminNote && entry\.adminNote && \(/,
  );

  assert.match(
    notes,
    /\? "Besked til medarbejderen:"[\s\S]*?: "Note om rettelsen:"/,
  );
});
