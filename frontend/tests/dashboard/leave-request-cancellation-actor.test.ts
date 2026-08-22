import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const employeeSource =
  readFileSync(
    "app/(app)/leave-requests/components/list/LeaveRequestsListSection.tsx",
    "utf8",
  );
const adminSource =
  readFileSync(
    "app/(app)/leave-approval/components/list/LeaveApprovalRequestCard.tsx",
    "utf8",
  );

test("medarbejderen ser dig ved egen annullering og ellers personens navn", () => {
  assert.match(
    employeeSource,
    /return "dig"/,
  );
  assert.match(
    employeeSource,
    /actor\.firstName/,
  );
  assert.match(
    employeeSource,
    /actor\.lastName/,
  );
});

test("admin ser navnet på den konkrete person der annullerede", () => {
  assert.match(
    adminSource,
    /request\.cancelledByUser/,
  );
  const cancelledLabelIndex =
    adminSource.indexOf(
      "Annulleret",
    );
  const cancelledActorIndex =
    adminSource.indexOf(
      "cancelledByText",
    );

  assert.ok(
    cancelledLabelIndex >= 0,
  );
  assert.ok(
    cancelledActorIndex >
      cancelledLabelIndex,
  );
  assert.doesNotMatch(
    adminSource,
    /Annulleret af administrationen/,
  );
});
