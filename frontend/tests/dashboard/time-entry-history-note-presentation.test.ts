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

test(
  "historik bruger mødetid og fyraften i note-labels",
  () => {
    assert.match(
      modal,
      /label="Note ved mødetid"/,
    );

    assert.match(
      modal,
      /label="Note ved fyraften"/,
    );

    assert.doesNotMatch(
      modal,
      /Note ved indstempling|Note ved udstempling/,
    );
  },
);

test(
  "historik skjuler kun afledt Note / begrundelse",
  () => {
    assert.match(
      modal,
      /function isDerivedClockNoteChange\(/,
    );

    assert.match(
      modal,
      /specificNoteChanged/,
    );

    assert.match(
      modal,
      /Fyraften: .*finishNote/,
    );

    assert.match(
      modal,
      /!isDerivedClockNoteChange\(\s*revision,?\s*\)/,
    );

    assert.match(
      modal,
      /label="Note \/ begrundelse"/,
    );
  },
);

test(
  "historikposter kan foldes sammen og vigtige handlinger starter åbne",
  () => {
    assert.match(
      modal,
      /function revisionStartsExpanded\(/,
    );

    assert.match(
      modal,
      /action === "NEEDS_CHANGES"/,
    );

    assert.match(
      modal,
      /action === "SENT_BACK"/,
    );

    assert.match(
      modal,
      /action === "VOIDED"/,
    );

    assert.match(
      modal,
      /<details[\s\S]*open=\{\s*startsExpanded\s*\}/,
    );

    assert.match(
      modal,
      /<summary/,
    );

    assert.match(
      modal,
      /Vis detaljer/,
    );

    assert.match(
      modal,
      /Skjul detaljer/,
    );

    assert.match(
      modal,
      /group-open:rotate-180/,
    );
  },
);

