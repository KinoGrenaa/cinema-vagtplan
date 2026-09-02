import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const picker = readFileSync(
  "app/components/date/ProjectTimePicker.tsx",
  "utf8",
);

test("klik i fælles klokkeslætsfelt markerer det segment brugeren faktisk klikker på", () => {
  assert.doesNotMatch(
    picker,
    /onFocus=\{\(event\) => \{[\s\S]*?setSelectionRange\(\s*0,\s*2,\s*\)[\s\S]*?\}\}/,
  );

  assert.match(
    picker,
    /onClick=\{\(event\) => \{\s*selectTimeSegment\(\s*event\.currentTarget,\s*event\.currentTarget\.selectionStart,\s*\);\s*\}\}/,
  );

  assert.match(
    picker,
    /if \(\s*caret <= 2\s*\) \{[\s\S]*?setSelectionRange\(\s*0,\s*2,\s*\)/,
  );

  assert.match(
    picker,
    /setSelectionRange\(\s*3,\s*5,\s*\)/,
  );
});
