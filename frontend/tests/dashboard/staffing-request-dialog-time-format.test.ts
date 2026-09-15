import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

import {
  getRequestDialogTimeRange,
} from "../../app/(app)/shift-trades/staffing/helpers/core/staffingRequestHelpers";
import type {
  StaffingRequest,
} from "../../app/(app)/shift-trades/staffing/helpers/core/staffingRequestTypes";

const staffingSection =
  readFileSync(
    "app/(app)/shift-trades/components/staffing/ShiftTradesStaffingSection.tsx",
    "utf8",
  );

const presentation =
  readFileSync(
    "app/(app)/shift-trades/staffing/helpers/core/staffingRequestPresentation.ts",
    "utf8",
  );

test("bemandingsdialoger viser ugedag i vagtens tidsrum", () => {
  const request = {
    status: "PENDING",
    requestStartTime:
      "2026-09-22T14:00:00.000Z",
    requestEndTime:
      "2026-09-22T19:35:00.000Z",
  } as StaffingRequest;

  assert.equal(
    getRequestDialogTimeRange(
      request,
    ),
    "Tirsdag 22.09.2026 kl. 16.00 → 21.35",
  );

  assert.match(
    staffingSection,
    /getRequestDialogTimeRange/,
  );

  assert.match(
    presentation,
    /getRequestDialogTimeRange/,
  );
});
