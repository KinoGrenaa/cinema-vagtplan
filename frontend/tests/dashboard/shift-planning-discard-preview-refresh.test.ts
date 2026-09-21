import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const page = fs.readFileSync(
  path.resolve(process.cwd(), "app/(app)/shift-planning/page.tsx"),
  "utf8",
);

test("Fortryd genindlæser publication-previewet for den samme gemte kladde", () => {
  const start = page.indexOf(
    "const discardSelectedDraftChanges = async () => {",
  );
  assert.ok(start >= 0);

  const end = page.indexOf("\n  const ", start + 10);
  assert.ok(end > start);

  const discard = page.slice(start, end);

  assert.match(
    discard,
    /await openDraftWorkspace\(selectedDraftId\);/,
  );
  assert.match(
    discard,
    /setDraftRefreshKey\(\(current\) => current \+ 1\);/,
  );
});

test("gemt kladde-preview genhentes når draftRefreshKey ændres", () => {
  assert.match(
    page,
    /\}, \[activeCinemaId, draftRefreshKey, selectedDraftId\]\);/,
  );
});
