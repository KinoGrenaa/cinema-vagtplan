import assert from "node:assert/strict";
import test from "node:test";

import {
  getTimeApprovalStatusCounts,
  getVisibleEntries,
  type TimeApprovalFilters,
} from "../../app/(app)/time-approval/helpers/core/timeApprovalFilters";

const defaultFilters: TimeApprovalFilters = {
  employeeSearch: "",
  showPending: true,
  showNeedsChanges: true,
  showApproved: false,
  showVoided: false,
  showPlannedEntries: true,
  showManualEntries: true,
  onlyWithDeviations: false,
  onlyWithNotes: false,
  dateFrom: "",
  dateTo: "",
};

test("åben afventende tidsregistrering vises i time approval", () => {
  const entry = {
    id: 5,
    status: "PENDING",
    clockIn: "2026-08-16T15:30:00.000Z",
    clockOut: null,
    shift: { id: 125 },
    user: {
      firstName: "Admin",
      lastName: "tester",
      email: "admin@test.dk",
    },
    deviation: { hasDeviation: true },
  } as any;

  const visible = getVisibleEntries(
    [entry],
    defaultFilters,
  );

  assert.deepEqual(
    visible.map((item) => item.id),
    [5],
  );
});

test("åben afventende tidsregistrering tæller som afventende", () => {
  const entry = {
    id: 5,
    status: "PENDING",
    clockIn: "2026-08-16T15:30:00.000Z",
    clockOut: null,
  } as any;

  assert.equal(
    getTimeApprovalStatusCounts(
      [entry],
    ).pendingCount,
    1,
  );
});
