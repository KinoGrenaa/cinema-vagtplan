import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/leave-approval/components/list/LeaveApprovalRequestsSection.tsx",
    "utf8",
  );

test("fraværsgodkendelsens accordion-fokus er neutral og følger afrundede hjørner", () => {
  assert.match(
    source,
    /focus-visible:ring-gray-400/,
  );
  assert.match(
    source,
    /dark:focus-visible:ring-gray-500/,
  );
  assert.doesNotMatch(
    source,
    /groupButtonClass\s*=\s*[^;]*focus-visible:ring-blue-600/,
  );

  assert.match(
    source,
    /isExpanded\s*\? "rounded-t-2xl"\s*:\s*"rounded-2xl"/,
  );
  assert.match(
    source,
    /isDateExpanded\s*\? "rounded-t-2xl"\s*:\s*"rounded-2xl"/,
  );
});
