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
  "oversigtsrækken viser Mangler note kun når både medarbejder- og adminnote mangler",
  () => {
    assert.match(
      card,
      /const hasEmployeeNote = Boolean\([\s\S]*entry\.clockInNote \|\| entry\.clockOutNote \|\| entry\.note[\s\S]*\)/,
    );

    assert.match(
      card,
      /const missingRequiredNote = Boolean\([\s\S]*entry\.deviation\?\.requiresNote[\s\S]*!hasNote[\s\S]*\)/,
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
  "afvigelsespanelet viser ikke Mangler note når medarbejder- eller adminnote findes",
  () => {
    assert.match(
      panel,
      /!isManualEntry &&[\s\S]*deviation\.requiresNote &&[\s\S]*entry\.clockInNote[\s\S]*entry\.clockOutNote[\s\S]*entry\.note[\s\S]*entry\.adminNote/,
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
