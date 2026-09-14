import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const picker = readFileSync(
  "app/components/date/ProjectTimePicker.tsx",
  "utf8",
);

test("klokkeslætsvælgerens urknap har mørk hover i dark mode", () => {
  assert.match(
    picker,
    /dark:hover:bg-gray-800/,
  );
  assert.match(
    picker,
    /dark:hover:text-gray-100/,
  );
  assert.match(
    picker,
    /hover:bg-gray-50/,
  );
});
