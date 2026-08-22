import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/leave-approval/components/list/LeaveApprovalRequestCard.tsx",
    "utf8",
  );

test("afvisning kræver eksplicit bekræftelse", () => {
  assert.match(
    source,
    /title="Afvis fraværsansøgning"/,
  );
  assert.match(
    source,
    /confirmText="Afvis ansøgning"/,
  );
  assert.match(
    source,
    /cancelText="Fortryd"/,
  );
  assert.match(
    source,
    /confirmVariant="danger"/,
  );
  assert.match(
    source,
    /setShowRejectConfirmation\([\s\S]*true/,
  );
  assert.match(
    source,
    /onConfirm=\{\(\) => \{[\s\S]*onUpdateStatus\([\s\S]*"REJECTED"/,
  );
});
