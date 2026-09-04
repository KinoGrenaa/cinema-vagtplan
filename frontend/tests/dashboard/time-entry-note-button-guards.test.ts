import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const registrationModal =
  readFileSync(
    "app/(app)/schedule/components/time-registration/TimeRegistrationModals.tsx",
    "utf8",
  );
const approvalCard =
  readFileSync(
    "app/(app)/time-approval/components/entry/TimeApprovalEntryCard.tsx",
    "utf8",
  );

test(
  "registreringsknapper er deaktiveret mens den eksisterende afvigelsesregel kræver en note",
  () => {
    assert.match(
      registrationModal,
      /roundedPlannedClockInTime !==[\s\S]*clockInTime[\s\S]*!clockNote\.trim\(\)/,
    );
    assert.match(
      registrationModal,
      /roundedPlannedClockOutTime !==[\s\S]*clockOutTime[\s\S]*!clockNote\.trim\(\)/,
    );
    assert.match(
      registrationModal,
      /disabled=\{clockInBlockedByMissingNote\}/,
    );
    assert.match(
      registrationModal,
      /disabled=\{clockOutBlockedByMissingNote\}/,
    );
  },
);

test(
  "Godkend er deaktiveret når Mangler note er sand",
  () => {
    assert.match(
      approvalCard,
      /disabled=\{missingRequiredNote\}/,
    );
    assert.match(
      approvalCard,
      /disabled:bg-gray-300/,
    );
  },
);
