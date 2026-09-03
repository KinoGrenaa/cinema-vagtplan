import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const notesSource =
  readFileSync(
    "app/(app)/time-approval/components/entry/TimeApprovalEntryNotes.tsx",
    "utf8",
  );

const historySource =
  readFileSync(
    "app/components/modals/time-entries/TimeEntryHistoryModal.tsx",
    "utf8",
  );

test(
  "manuel registrering viser ikke samme medarbejdernote to gange",
  () => {
    assert.match(
      notesSource,
      /\{entry\.shift\s*&&\s*!entry\.clockInNote\s*&&\s*!entry\.clockOutNote\s*&&\s*entry\.note\s*&&\s*\(/,
    );

    assert.match(
      notesSource,
      /<span className="font-semibold">Note:<\/span>/,
    );

    assert.match(
      notesSource,
      /<span className="font-semibold">Medarbejder note:<\/span>/,
    );
  },
);

test(
  "historikken bruger Skal rettes som brugerrettet statusnavn",
  () => {
    assert.match(
      historySource,
      /case "NEEDS_CHANGES":\s*return "Skal rettes";/,
    );

    assert.doesNotMatch(
      historySource,
      /case "NEEDS_CHANGES":\s*return "Kræver handling";/,
    );
  },
);
