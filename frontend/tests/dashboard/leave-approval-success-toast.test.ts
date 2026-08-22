import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const dataSource =
  readFileSync(
    "app/(app)/leave-approval/hooks/data/useLeaveApprovalData.ts",
    "utf8",
  );

const pageSource =
  readFileSync(
    "app/(app)/leave-approval/page.tsx",
    "utf8",
  );

const toastSource =
  readFileSync(
    "app/(app)/leave-approval/components/feedback/LeaveApprovalSuccessToast.tsx",
    "utf8",
  );

test("fraværsgodkendelse viser statusafhængig success-toast efter vellykket ændring", () => {
  assert.match(
    dataSource,
    /case "APPROVED":[\s\S]*Fraværsansøgningen er godkendt\./,
  );
  assert.match(
    dataSource,
    /case "REJECTED":[\s\S]*Fraværsansøgningen er afvist\./,
  );
  assert.match(
    dataSource,
    /case "CANCELLED":[\s\S]*Fraværsansøgningen er annulleret\./,
  );
  assert.match(
    dataSource,
    /await fetchRequests\(\);[\s\S]*setSuccessToast\([\s\S]*getStatusSuccessMessage/,
  );
  assert.match(
    dataSource,
    /window\.setTimeout\([\s\S]*4000/,
  );
});

test("success-toast er ikke-blokerende, tilgængelig og kan lukkes", () => {
  assert.match(
    toastSource,
    /role="status"/,
  );
  assert.match(
    toastSource,
    /aria-live="polite"/,
  );
  assert.match(
    toastSource,
    /pointer-events-none fixed/,
  );
  assert.match(
    toastSource,
    /aria-label="Luk besked"/,
  );
  assert.match(
    pageSource,
    /<LeaveApprovalSuccessToast/,
  );
  assert.match(
    pageSource,
    /successToast/,
  );
  assert.match(
    pageSource,
    /dismissSuccessToast/,
  );
});
