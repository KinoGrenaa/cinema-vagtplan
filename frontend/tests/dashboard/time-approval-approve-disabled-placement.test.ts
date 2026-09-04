import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/time-approval/components/entry/TimeApprovalEntryCard.tsx",
    "utf8",
  );

test(
  "Godkend-knappen har disabled direkte på button-elementet",
  () => {
    const disabledOccurrences =
      source.match(
        /disabled=\{missingRequiredNote\}/g,
      ) ?? [];

    assert.equal(
      disabledOccurrences.length,
      1,
      "disabled={missingRequiredNote} skal forekomme præcis én gang",
    );

    assert.match(
      source,
      /<button\s+type="button"\s+onClick=\{\(\) => onApprove\(entry\)\}\s+disabled=\{missingRequiredNote\}\s+className=\{summaryPrimaryAction\}\s*>\s*Godkend\s*<\/button>/s,
    );

    assert.doesNotMatch(
      source,
      /disabled=\{missingRequiredNote\}\s*\{hasNote && \(/s,
    );
  },
);

test(
  "Godkend-knappens styling har en tydelig disabled-tilstand",
  () => {
    assert.match(
      source,
      /disabled:cursor-not-allowed/,
    );
    assert.match(
      source,
      /disabled:bg-gray-300/,
    );
    assert.match(
      source,
      /dark:disabled:bg-gray-800/,
    );
  },
);
