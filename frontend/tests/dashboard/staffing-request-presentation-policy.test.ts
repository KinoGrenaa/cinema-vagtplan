import assert from "node:assert/strict";
import test from "node:test";

import {
  getFirstCompletedStaffingRequestIndex,
  getStaffingRequestActionState,
  getStaffingRequestRejectActionLabel,
  getStaffingRequestRejectDialogCopy,
  getStaffingRequestHistoryEvents,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestPresentation";
import {
  getRequestTimeRange,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestHelpers";
import type {
  StaffingRequest,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestTypes";

function makeRequest(
  overrides:
    Partial<StaffingRequest> = {},
): StaffingRequest {
  return {
    id: 42,
    type:
      "EXTRA_SHIFT",
    status:
      "PENDING",
    priority: 1,
    aiGenerated: false,
    createdAt:
      "2026-09-13T08:00:00.000Z",
    requestStartTime:
      "2026-09-13T09:05:00.000Z",
    requestEndTime:
      "2026-09-13T17:35:00.000Z",
    requestedByUser: {
      id: 1,
      firstName:
        "Admin",
      lastName:
        "tester",
    },
    targetUser: null,
    jobFunction: {
      name:
        "C Vagt Weekend",
    },
    ...overrides,
  };
}

test("medarbejderens Tak nej-dialog bygges ud fra data, ikke TSX-layout", () => {
  const request =
    makeRequest();
  const copy =
    getStaffingRequestRejectDialogCopy(
      "EMPLOYEE",
      request,
    );
  const timeRange =
    getRequestTimeRange(
      request,
    );

  assert.equal(
    copy.title,
    "Tak nej til vagten?",
  );
  assert.equal(
    copy.confirmText,
    "Tak nej",
  );
  assert.match(
    copy.description,
    /C Vagt Weekend/,
  );
  assert.match(
    copy.description,
    /Sendt af Admin tester/,
  );
  assert.match(
    copy.description,
    /Vil du takke nej til denne vagt\?/,
  );
  assert.ok(
    timeRange &&
      copy.description.includes(
        timeRange,
      ),
  );
});

test("admin beholder Afvis-dialogen", () => {
  const copy =
    getStaffingRequestRejectDialogCopy(
      "ADMIN",
      makeRequest(),
    );

  assert.equal(
    copy.title,
    "Afvis bemandingsforespørgsel",
  );
  assert.equal(
    copy.confirmText,
    "Afvis",
  );
  assert.match(
    copy.description,
    /Vil du afvise denne bemandingsforespørgsel\?/,
  );
});

test("kortknappen bruger medarbejdersprog uden at ændre admin-sprog", () => {
  assert.equal(
    getStaffingRequestRejectActionLabel(
      "EMPLOYEE",
    ),
    "Tak nej",
  );
  assert.equal(
    getStaffingRequestRejectActionLabel(
      "ADMIN",
    ),
    "Afvis",
  );
});

test("broadcast kan afvises personligt af medarbejderen", () => {
  const state =
    getStaffingRequestActionState(
      makeRequest({
        targetUser: null,
      }),
      "EMPLOYEE",
      7,
      false,
    );

  assert.equal(
    state.canShowAccept,
    true,
  );
  assert.equal(
    state.canReject,
    true,
  );
  assert.equal(
    state.canCancel,
    false,
  );
});

test("admin kan administrere broadcast men afviser ikke på medarbejderens vegne", () => {
  const state =
    getStaffingRequestActionState(
      makeRequest({
        targetUser: null,
      }),
      "ADMIN",
      1,
      true,
    );

  assert.equal(
    state.canShowAccept,
    true,
  );
  assert.equal(
    state.canReject,
    false,
  );
  assert.equal(
    state.canCancel,
    true,
  );
});

test("direkte forespørgsel kan kun afvises af den valgte medarbejder", () => {
  const direct =
    makeRequest({
      targetUser: {
        id: 7,
        firstName:
          "Test",
        lastName:
          "1 tester",
      },
    });

  assert.equal(
    getStaffingRequestActionState(
      direct,
      "EMPLOYEE",
      7,
      false,
    ).canReject,
    true,
  );
  assert.equal(
    getStaffingRequestActionState(
      direct,
      "EMPLOYEE",
      8,
      false,
    ).canReject,
    false,
  );
});

test("kendt vagtkonflikt deaktiverer accept men ikke Tak nej", () => {
  const state =
    getStaffingRequestActionState(
      makeRequest({
        acceptanceConflictShift: {
          id: 99,
          startTime:
            "2026-09-13T15:30:00.000Z",
          endTime:
            "2026-09-13T18:05:00.000Z",
          title:
            "B Vagt Weekend",
        },
      }),
      "EMPLOYEE",
      7,
      false,
    );

  assert.equal(
    state.canShowAccept,
    true,
  );
  assert.equal(
    state.canAccept,
    false,
  );
  assert.equal(
    state.canReject,
    true,
  );
});

test("afvisningshistorik leverer den direkte modtager og tidspunkt", () => {
  const request =
    makeRequest({
      status:
        "REJECTED",
      rejectedAt:
        "2026-09-13T08:43:00.000Z",
      targetUser: {
        id: 7,
        firstName:
          "Test",
        lastName:
          "1 tester",
      },
    });

  const events =
    getStaffingRequestHistoryEvents(
      request,
      false,
    );

  assert.equal(
    events.length,
    1,
  );
  assert.equal(
    events[0]?.user?.id,
    7,
  );
  assert.equal(
    events[0]?.occurredAt,
    request.rejectedAt,
  );
});

test("admin får personlige broadcast-afvisninger uden at forespørgslen behøver være afsluttet", () => {
  const request =
    makeRequest({
      status:
        "PENDING",
      targetUser: null,
      declines: [
        {
          userId: 7,
          declinedAt:
            "2026-09-13T08:43:00.000Z",
          user: {
            id: 7,
            firstName:
              "Test",
            lastName:
              "1 tester",
          },
        },
      ],
    });

  assert.equal(
    getStaffingRequestHistoryEvents(
      request,
      false,
    ).length,
    0,
  );

  const managerEvents =
    getStaffingRequestHistoryEvents(
      request,
      true,
    );

  assert.equal(
    managerEvents.length,
    1,
  );
  assert.equal(
    managerEvents[0]?.user?.id,
    7,
  );
});

test("admin ser både tidligere nej og den medarbejder der accepterede broadcasten", () => {
  const request =
    makeRequest({
      status:
        "ACCEPTED",
      acceptedAt:
        "2026-09-13T09:05:00.000Z",
      acceptedByUser: {
        id: 9,
        firstName:
          "Test",
        lastName:
          "4 tester",
      },
      targetUser: null,
      declines: [
        {
          userId: 7,
          declinedAt:
            "2026-09-13T09:03:00.000Z",
          user: {
            id: 7,
            firstName:
              "Test",
            lastName:
              "1 tester",
          },
        },
      ],
    });

  const events =
    getStaffingRequestHistoryEvents(
      request,
      true,
    );

  assert.deepEqual(
    events.map((event) => ({
      action:
        event.action,
      userId:
        event.user?.id ??
        null,
      occurredAt:
        event.occurredAt,
    })),
    [
      {
        action:
          "REJECTED",
        userId: 7,
        occurredAt:
          "2026-09-13T09:03:00.000Z",
      },
      {
        action:
          "ACCEPTED",
        userId: 9,
        occurredAt:
          "2026-09-13T09:05:00.000Z",
      },
    ],
  );
});

test("ældre accepterede forespørgsler viser accepttid uden at gætte på aktøren", () => {
  const request =
    makeRequest({
      status:
        "ACCEPTED",
      acceptedAt:
        "2026-09-13T09:05:00.000Z",
      acceptedByUser:
        null,
    });

  const events =
    getStaffingRequestHistoryEvents(
      request,
      true,
    );

  assert.equal(
    events.length,
    1,
  );
  assert.equal(
    events[0]?.action,
    "ACCEPTED",
  );
  assert.equal(
    events[0]?.user,
    null,
  );
  assert.equal(
    events[0]?.occurredAt,
    request.acceptedAt,
  );
});

test("historikgrænsen findes ud fra status og ikke JSX-placering", () => {
  const visible = [
    makeRequest({
      id: 1,
      status:
        "PENDING",
    }),
    makeRequest({
      id: 2,
      status:
        "PENDING",
    }),
    makeRequest({
      id: 3,
      status:
        "REJECTED",
    }),
  ];

  assert.equal(
    getFirstCompletedStaffingRequestIndex(
      visible,
      true,
    ),
    2,
  );
  assert.equal(
    getFirstCompletedStaffingRequestIndex(
      visible,
      false,
    ),
    -1,
  );
});
