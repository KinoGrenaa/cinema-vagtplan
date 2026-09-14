import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
} from "node:fs";

import {
  getStaffingRequestHistoryEvents,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestPresentation";
import {
  getRequestTimeRange,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestHelpers";
import type {
  StaffingRequest,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestTypes";

test("annulleret bemandingsforespørgsel viser aktør, tidspunkt og konkret årsag", () => {
  const request = {
    id: 41,
    status: "CANCELLED",
    cancelledAt:
      "2026-09-14T18:05:00.000Z",
    cancellationReason:
      "SHIFT_REASSIGNED",
    cancelledByUser: {
      id: 2,
      firstName:
        "Admin",
      lastName:
        "tester",
    },
  } as StaffingRequest;

  assert.deepEqual(
    getStaffingRequestHistoryEvents(
      request,
      false,
    ),
    [
      {
        key:
          "cancelled-41",
        action:
          "CANCELLED",
        user: {
          id: 2,
          firstName:
            "Admin",
          lastName:
            "tester",
        },
        occurredAt:
          "2026-09-14T18:05:00.000Z",
        detail:
          "Vagten blev tildelt en anden medarbejder.",
      },
    ],
  );
});

test("andre annulleringsårsager får stabil dansk historiktekst", () => {
  const cases = [
    [
      "MANUAL_CANCELLED",
      "Forespørgslen blev annulleret manuelt.",
    ],
    [
      "SHIFT_DELETED",
      "Vagten blev slettet.",
    ],
    [
      "SHIFT_MOVED",
      "Vagten blev flyttet til en anden dato.",
    ],
    [
      "OTHER_REQUEST_ACCEPTED",
      "En anden bemandingsforespørgsel på vagten blev accepteret.",
    ],
  ] as const;

  for (
    const [
      cancellationReason,
      expectedDetail,
    ] of cases
  ) {
    const events =
      getStaffingRequestHistoryEvents(
        {
          id: 50,
          status:
            "CANCELLED",
          cancelledAt:
            "2026-09-14T18:05:00.000Z",
          cancellationReason,
        } as StaffingRequest,
        false,
      );

    assert.equal(
      events[0]
        ?.detail,
      expectedDetail,
    );
  }
});

test("historikkortet kan vise Annulleret og årsagsdetaljen", () => {
  const source =
    readFileSync(
      "app/(app)/staffing-requests/components/list/StaffingRequestsListSection.tsx",
      "utf8",
    );

  assert.match(
    source,
    /"CANCELLED"[\s\S]*?"Annulleret"/,
  );
  assert.match(
    source,
    /event\.detail/,
  );
});


test("afsluttet forespørgsel bevarer det oprindelige vagtinterval efter at vagten er flyttet", () => {
  const request = {
    id: 61,
    status: "CANCELLED",
    requestStartTime:
      "2026-09-19T16:30:00+02:00",
    requestEndTime:
      "2026-09-19T19:35:00+02:00",
    shift: {
      startTime:
        "2026-09-20T16:30:00+02:00",
      endTime:
        "2026-09-20T19:35:00+02:00",
    },
  } as StaffingRequest;

  const range =
    getRequestTimeRange(
      request,
    );

  assert.match(
    range ?? "",
    /^19\.09\.2026 /,
  );
  assert.doesNotMatch(
    range ?? "",
    /20\.09\.2026/,
  );
});

test("åben forespørgsel følger fortsat den aktuelle vagt", () => {
  const request = {
    id: 62,
    status: "PENDING",
    requestStartTime:
      "2026-09-19T16:30:00+02:00",
    requestEndTime:
      "2026-09-19T19:35:00+02:00",
    shift: {
      startTime:
        "2026-09-20T16:30:00+02:00",
      endTime:
        "2026-09-20T19:35:00+02:00",
    },
  } as StaffingRequest;

  const range =
    getRequestTimeRange(
      request,
    );

  assert.match(
    range ?? "",
    /^20\.09\.2026 /,
  );
});
