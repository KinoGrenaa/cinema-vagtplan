import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const confirmModal =
  readFileSync(
    "app/components/modals/ConfirmModal.tsx",
    "utf8",
  );

test("ConfirmModal bruger sort tekst i light mode", () => {
  assert.match(
    confirmModal,
    /whitespace-pre-line text-gray-950 dark:text-gray-100/,
  );

  assert.match(
    confirmModal,
    /font-medium text-gray-950 transition/,
  );

  assert.doesNotMatch(
    confirmModal,
    /whitespace-pre-line text-gray-600/,
  );
});