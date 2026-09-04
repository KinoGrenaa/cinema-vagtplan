import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const panelSource =
  readFileSync(
    "app/(app)/time-approval/components/entry/DeviationPanel.tsx",
    "utf8",
  );

const utilsSource =
  readFileSync(
    "app/(app)/time-approval/utils.ts",
    "utf8",
  );

test(
  "time approval viser kun planlagt og registreret arbejdstid i statistikblokken",
  () => {
    assert.match(
      panelSource,
      /Planlagt arbejdstid:\s*(?:\{\s*" "\s*\}\s*)?\{formatDurationMinutes\(deviation\.plannedMinutes\)\}/,
    );

    assert.match(
      panelSource,
      /Registreret arbejdstid:\s*(?:\{\s*" "\s*\}\s*)?\{formatDurationMinutes\(deviation\.registeredMinutes\)\}/,
    );

    assert.doesNotMatch(
      panelSource,
      /Difference:/,
    );

    assert.doesNotMatch(
      panelSource,
      /Mødetidsafvigelse:\s*\{" "\}/,
    );

    assert.doesNotMatch(
      panelSource,
      /Fyraftensafvigelse:\s*\{" "\}/,
    );
  },
);

test(
  "den tydelige afvigelseslinje bruger timer og minutter med fortegn",
  () => {
    assert.match(
      utilsSource,
      /export function formatSignedDurationMinutes\(/,
    );

    assert.match(
      utilsSource,
      /return `\$\{sign\}\$\{formatDurationMinutes\(Math\.abs\(roundedMinutes\)\)\}`/,
    );

    assert.match(
      panelSource,
      /Mødetidsafvigelse: \$\{formatSignedDurationMinutes\(/,
    );

    assert.match(
      panelSource,
      /Fyraftensafvigelse: \$\{formatSignedDurationMinutes\(/,
    );

    assert.match(
      panelSource,
      /deviationMessages\.map\(\(message, index\) => \(/,
    );
  },
);
