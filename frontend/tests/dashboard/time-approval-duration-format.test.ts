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
  "time approval viser samlede arbejdstider som timer og minutter uden plusfortegn",
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
      /Planlagt tid:\s*\{formatMinutes\(deviation\.plannedMinutes\)\}/,
    );

    assert.doesNotMatch(
      panelSource,
      /Registreret tid:\s*\{formatMinutes\(deviation\.registeredMinutes\)\}/,
    );
  },
);

test(
  "varighedsformatet viser hele timer med eksplicitte minutter",
  () => {
    assert.match(
      utilsSource,
      /export function formatDurationMinutes\(/,
    );

    assert.match(
      utilsSource,
      /\$\{sign\}\$\{hours\} t \$\{String\(minutes\)\.padStart\(2, "0"\)\} min/,
    );

    assert.match(
      panelSource,
      /Difference:\s*\{formatMinutes\(deviation\.differenceMinutes\)\}/,
    );

    assert.match(
      panelSource,
      /Mødetidsafvigelse:[\s\S]*Fyraftensafvigelse:/,
    );

    assert.match(
      panelSource,
      /<span aria-hidden="true">·<\/span>/,
    );
  },
);
