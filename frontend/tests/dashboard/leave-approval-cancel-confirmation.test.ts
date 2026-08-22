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

test("admin-annullering kræver eksplicit bekræftelse", () => {
  assert.match(
    source,
    /showCancelConfirmation/,
  );
  assert.match(
    source,
    /Annullér fraværsansøgning/,
  );
  assert.match(
    source,
    /Annullér godkendt fravær/,
  );
  assert.match(
    source,
    /cancelText="Fortryd"/,
  );
  assert.match(
    source,
    /setShowCancelConfirmation\([\s\S]*true/,
  );
  assert.match(
    source,
    /onConfirm=\{\(\) => \{[\s\S]*setShowCancelConfirmation\([\s\S]*false[\s\S]*onUpdateStatus\([\s\S]*"CANCELLED"/,
  );
});

test("annulleringsknappen sender ikke CANCELLED direkte", () => {
  const actionStart =
    source.indexOf(
      "{(request.status ===",
      source.indexOf(
        'setShowRejectConfirmation',
      ),
    );
  const noActionStart =
    source.indexOf(
      `{(request.status ===
            "REJECTED"`,
      actionStart,
    );
  const actions =
    source.slice(
      actionStart,
      noActionStart,
    );

  assert.match(
    actions,
    /setShowCancelConfirmation/,
  );
  assert.doesNotMatch(
    actions,
    /onUpdateStatus\([\s\S]*"CANCELLED"/,
  );
});
