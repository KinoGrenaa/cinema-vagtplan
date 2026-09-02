import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const card = readFileSync(
  "app/(app)/my-time/components/list/MyTimeEntryCard.tsx",
  "utf8",
);

const types = readFileSync(
  "app/(app)/my-time/helpers/core/myTimeTypes.ts",
  "utf8",
);

test("my-time viser den konkrete person bag en returbesked", () => {
  assert.match(
    card,
    /entry\.revisions\?\.\[0\]\?\.changedByUser/,
  );

  assert.match(
    card,
    /`Besked fra \$\{formatReturnMessageActor\(entry\)\}`/,
  );

  assert.doesNotMatch(
    card,
    /\? "Besked fra administrationen"/,
  );

  assert.match(
    types,
    /revisions\?: \{[\s\S]*?changedByUser\?: \{[\s\S]*?firstName: string;[\s\S]*?lastName: string;/,
  );
});
