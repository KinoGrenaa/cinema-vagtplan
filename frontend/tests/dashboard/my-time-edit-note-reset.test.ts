import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/my-time/hooks/actions/useMyTimeEdit.ts",
    "utf8",
  );

test(
  "planlagte vagter starter med tomme note-felter ved medarbejderrettelse",
  () => {
    assert.match(
      source,
      /setEditClockInNote\(\s*entry\.shift\s*\?\s*""\s*:\s*entry\.clockInNote\s*\?\?\s*""\s*,?\s*\)/,
    );

    assert.match(
      source,
      /setEditClockOutNote\(\s*entry\.shift\s*\?\s*""\s*:\s*entry\.clockOutNote\s*\?\?\s*""\s*,?\s*\)/,
    );
  },
);

test(
  "manuel registrering uden vagt bevarer sin generelle note ved redigering",
  () => {
    assert.match(
      source,
      /setEditNote\(getEntrySingleNote\(entry\)\)/,
    );

    assert.match(
      source,
      /const notePayload = editingEntry\.shift[\s\S]*clockInNote: editClockInNote,[\s\S]*clockOutNote: editClockOutNote,[\s\S]*:\s*\{[\s\S]*note:[\s\S]*editNote\.trim\(\) \|\| null/,
    );
  },
);

test(
  "gamle clock-noter bliver ikke automatisk sendt igen efter åbning af en planlagt vagt",
  () => {
    assert.doesNotMatch(
      source,
      /setEditClockInNote\(entry\.clockInNote \?\? ""\)/,
    );

    assert.doesNotMatch(
      source,
      /setEditClockOutNote\(entry\.clockOutNote \?\? ""\)/,
    );
  },
);
