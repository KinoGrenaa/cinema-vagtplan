import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(
  "app/(app)/my-time/components/layout/MyTimeHeader.tsx",
  "utf8",
);

test("my-time har en tydelig genvej til vagtplanen", () => {
  assert.match(
    header,
    /import Link from "next\/link";/,
  );
  assert.match(
    header,
    /href="\/schedule"/,
  );
  assert.match(
    header,
    />\s*Se vagtplan\s*</,
  );
});
