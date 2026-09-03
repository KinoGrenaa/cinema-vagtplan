import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/time-approval/components/entry/DeviationPanel.tsx",
    "utf8",
  );

test(
  "manuel registrering uden vagt vises som neutral information",
  () => {
    assert.match(
      source,
      /isManualEntry\s*\?\s*"border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950\/30"/,
    );

    assert.match(
      source,
      /\{!isManualEntry && \(/,
    );

    assert.doesNotMatch(
      source,
      /isManualEntry\s*\?\s*"Manuel registrering"\s*:\s*deviation\.hasDeviation/,
    );

    assert.match(
      source,
      /Arbejde uden planlagt vagt/,
    );

    assert.match(
      source,
      /Denne tidsregistrering er ikke tilknyttet en planlagt vagt/,
    );
  },
);
