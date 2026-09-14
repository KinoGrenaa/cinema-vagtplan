import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const actions = readFileSync(
  "app/(app)/staffing-requests/hooks/actions/useStaffingRequestActions.ts",
  "utf8",
);
const section = readFileSync(
  "app/(app)/shift-trades/components/staffing/ShiftTradesStaffingSection.tsx",
  "utf8",
);

test("staffing action-hook rapporterer succes og fejl uden selv at vise toast", () => {
  assert.doesNotMatch(
    actions,
    /from "sonner"/,
  );
  assert.doesNotMatch(
    actions,
    /toast\.success/,
  );
  assert.match(
    actions,
    /const acceptRequest[\s\S]*?await fetchRequests\(\);\s*return true;[\s\S]*?return false;/,
  );
  assert.match(
    actions,
    /const rejectRequest[\s\S]*?await fetchRequests\(\);\s*return true;[\s\S]*?return false;/,
  );
});

test("shift-trades viser accept-feedback først efter confirm-modal er lukket", () => {
  assert.match(
    section,
    /confirmDialog\.open \|\|\s*!pendingSuccessMessage/,
  );
  assert.match(
    section,
    /toast\.success\(\s*pendingSuccessMessage,?\s*\)/,
  );
  assert.match(
    section,
    /await acceptRequest\([\s\S]*?setPendingSuccessMessage\(\s*"Vagten er accepteret\."/,
  );
});

test("shift-trades viser Tak nej-feedback først efter confirm-modal er lukket", () => {
  assert.match(
    section,
    /await rejectRequest\([\s\S]*?setPendingSuccessMessage\(\s*"Du har takket nej til vagten\."/,
  );
});
