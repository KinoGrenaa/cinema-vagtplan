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

const card =
  readFileSync(
    "app/(app)/time-approval/components/entry/TimeApprovalEntryCard.tsx",
    "utf8",
  );

const panel =
  readFileSync(
    "app/(app)/time-approval/components/entry/DeviationPanel.tsx",
    "utf8",
  );

test(
  "admin kan gemme en note uden at ændre tiderne",
  () => {
    assert.match(
      actions,
      /const hasAdminNoteChange =\s*data\.adminNote\.trim\(\) !==\s*\(editEntry\.adminNote \?\? ""\)\.trim\(\);/s,
    );

    assert.match(
      actions,
      /const hasChanges =\s*hasTimeChanges \|\|\s*hasAdminNoteChange;/s,
    );

    assert.match(
      actions,
      /title: isNoteOnlyChange\s*\? "Bekræft admin-note"\s*: "Bekræft rettelse"/s,
    );

    assert.match(
      actions,
      /confirmText: isNoteOnlyChange\s*\? "Gem note"\s*: "Gem rettelse"/s,
    );
  },
);

test(
  "admin-note opfylder notekravet i oversigt og afvigelsespanel",
  () => {
    assert.match(
      card,
      /const hasNote = Boolean\(\s*hasEmployeeNote \|\| entry\.adminNote,\s*\);/s,
    );

    assert.match(
      card,
      /const missingRequiredNote = Boolean\(\s*entry\.shift &&\s*entry\.deviation\?\.requiresNote &&\s*!hasNote,\s*\);/s,
    );

    assert.match(
      panel,
      /deviation\.requiresNote &&[\s\S]*entry\.clockInNote[\s\S]*entry\.clockOutNote[\s\S]*entry\.note[\s\S]*entry\.adminNote/s,
    );
  },
);
