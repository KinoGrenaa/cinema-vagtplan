import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/leave-approval/hooks/data/useLeaveApprovalData.ts",
    "utf8",
  );

test("fraværsgodkendelse holder fetch callback stabil og undgår automatisk fetch-loop", () => {
  assert.match(
    source,
    /const showError\s*=\s*infoDialog\.showError;/,
  );

  const fetchStart =
    source.indexOf(
      "const fetchRequests =",
    );
  const loadMoreStart =
    source.indexOf(
      "const loadMore =",
    );

  assert.ok(
    fetchStart >= 0 &&
      loadMoreStart >
        fetchStart,
  );

  const fetchBlock =
    source.slice(
      fetchStart,
      loadMoreStart,
    );

  assert.match(
    fetchBlock,
    /shouldShowError = true/,
  );
  assert.match(
    fetchBlock,
    /if \(shouldShowError\) \{\s*showError\(/,
  );
  assert.doesNotMatch(
    fetchBlock,
    /async \(\s*showError = true/,
  );
  assert.match(
    fetchBlock,
    /\[\s*buildPageEndpoint,\s*currentUser,\s*showError,\s*needsMasterCinemaSelection,\s*\]/,
  );
  assert.doesNotMatch(
    fetchBlock,
    /infoDialog\.showError\(/,
  );
  assert.doesNotMatch(
    fetchBlock,
    /\[\s*buildPageEndpoint,\s*currentUser,\s*infoDialog,/,
  );
});
