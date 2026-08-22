import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/leave-requests/hooks/page/useLeaveRequestsPage.ts",
  "utf8",
);

test("fraværssiden holder fejlcallback stabil og undgår automatisk fetch-loop", () => {
  assert.match(
    source,
    /const showError\s*=\s*useCallback\s*\(/,
  );

  const shorthandBindings =
    source.match(
      /^\s*showError,\s*$/gm,
    ) ?? [];

  assert.equal(
    shorthandBindings.length,
    4,
  );
  assert.match(
    source,
    /showInfo:\s*infoDialog\.showSuccess/,
  );
  assert.doesNotMatch(
    source,
    /showError:\s*\(\s*title,/,
  );
});
