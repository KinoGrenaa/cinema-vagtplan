import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const card = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalEntryCard.tsx",
  "utf8",
);

const panel = readFileSync(
  "app/(app)/time-approval/components/entry/DeviationPanel.tsx",
  "utf8",
);

test(
  "oversigtsrækken viser Mangler note kun når en påkrævet medarbejdernote faktisk mangler",
  () => {
    assert.match(
      card,
      /const hasEmployeeNote = Boolean\([\s\S]*entry\.clockInNote \|\| entry\.clockOutNote \|\| entry\.note[\s\S]*\)/,
    );

    assert.match(
      card,
      /const missingRequiredNote = Boolean\([\s\S]*entry\.deviation\?\.requiresNote[\s\S]*!hasEmployeeNote[\s\S]*\)/,
    );

    assert.match(
      card,
      /\{missingRequiredNote && \([\s\S]*Mangler note[\s\S]*\)\}/,
    );

    assert.doesNotMatch(
      card,
      />\s*Kræver note\s*</,
    );
  },
);

test(
  "afvigelsespanelet viser ikke manglende-note badge når medarbejdernoten findes",
  () => {
    assert.match(
      panel,
      /!isManualEntry &&[\s\S]*deviation\.requiresNote &&[\s\S]*!\(entry\.clockInNote \|\| entry\.clockOutNote \|\| entry\.note\)/,
    );

    assert.match(
      panel,
      />\s*Mangler note\s*</,
    );

    assert.doesNotMatch(
      panel,
      />\s*Kræver note\s*</,
    );
  },
);

test(
  "det almindelige Note-badge bevares",
  () => {
    assert.match(
      card,
      /\{hasNote && \([\s\S]*>\s*Note\s*</,
    );
  },
);
