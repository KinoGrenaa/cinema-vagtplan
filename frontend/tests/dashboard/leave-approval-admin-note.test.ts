import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const card =
  readFileSync(
    "app/(app)/leave-approval/components/list/LeaveApprovalRequestCard.tsx",
    "utf8",
  );
const hook =
  readFileSync(
    "app/(app)/leave-approval/hooks/data/useLeaveApprovalData.ts",
    "utf8",
  );
const confirmModal =
  readFileSync(
    "app/components/modals/ConfirmModal.tsx",
    "utf8",
  );
const employeeList =
  readFileSync(
    "app/(app)/leave-requests/components/list/LeaveRequestsListSection.tsx",
    "utf8",
  );

test("admin skal skrive note ved afvisning og annullering", () => {
  assert.match(
    card,
    /Bemærkning til medarbejderen/g,
  );
  assert.match(
    card,
    /confirmDisabled=\{[\s\S]*!rejectNote\.trim\(\)/,
  );
  assert.match(
    card,
    /confirmDisabled=\{[\s\S]*!cancelNote\.trim\(\)/,
  );
  assert.match(
    card,
    /"REJECTED",[\s\S]*note/,
  );
  assert.match(
    card,
    /"CANCELLED",[\s\S]*note/,
  );
});

test("status-hook sender note til backend", () => {
  assert.match(
    hook,
    /note\?: string/,
  );
  assert.match(
    hook,
    /JSON\.stringify\(\{[\s\S]*status,[\s\S]*note/,
  );
});

test("ConfirmModal kan deaktivere bekræftelse og vise feltindhold", () => {
  assert.match(
    confirmModal,
    /confirmDisabled\?: boolean/,
  );
  assert.match(
    confirmModal,
    /children\?: ReactNode/,
  );
  assert.match(
    confirmModal,
    /loading \|\|[\s\S]*confirmDisabled/,
  );
});

test("medarbejderen kan se adminnote og handlingsaktør", () => {
  assert.match(
    employeeList,
    /rejectionNote/,
  );
  assert.match(
    employeeList,
    /cancellationNote/,
  );
  assert.match(
    employeeList,
    /formatRejectionActor/,
  );
});
