import assert from "node:assert/strict";
import test from "node:test";
import {
  readFileSync,
} from "node:fs";

import {
  groupCompletedStaffingRequestsByShiftDate,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestPresentation";
import type {
  StaffingRequest,
} from "../../app/(app)/staffing-requests/helpers/core/staffingRequestTypes";

function makeRequest(
  id: number,
  status:
    StaffingRequest["status"],
  requestStartTime:
    string,
): StaffingRequest {
  return {
    id,
    status,
    requestStartTime,
    createdAt:
      "2026-09-14T12:00:00.000Z",
  } as StaffingRequest;
}

test("behandlede bemandingsforespørgsler grupperes efter vagtens københavnske dato", () => {
  const groups =
    groupCompletedStaffingRequestsByShiftDate(
      [
        makeRequest(
          1,
          "CANCELLED",
          "2026-09-16T16:15:00.000Z",
        ),
        makeRequest(
          2,
          "ACCEPTED",
          "2026-09-16T18:00:00.000Z",
        ),
        makeRequest(
          3,
          "REJECTED",
          "2026-09-15T18:00:00.000Z",
        ),
        makeRequest(
          4,
          "PENDING",
          "2026-09-17T18:00:00.000Z",
        ),
      ],
    );

  assert.equal(
    groups.length,
    2,
  );
  assert.equal(
    groups[0]?.dateKey,
    "2026-09-16",
  );
  assert.equal(
    groups[0]?.label,
    "Onsdag 16.09.2026",
  );
  assert.deepEqual(
    groups[0]?.requests.map(
      (request) =>
        request.id,
    ),
    [1, 2],
  );
  assert.equal(
    groups[1]?.dateKey,
    "2026-09-15",
  );
  assert.equal(
    groups[1]?.label,
    "Tirsdag 15.09.2026",
  );
});

test("datoen bestemmes i Europe/Copenhagen og ikke af oprettelsestidspunktet", () => {
  const groups =
    groupCompletedStaffingRequestsByShiftDate(
      [
        makeRequest(
          7,
          "CANCELLED",
          "2026-09-15T22:30:00.000Z",
        ),
      ],
    );

  assert.equal(
    groups[0]?.dateKey,
    "2026-09-16",
  );
  assert.equal(
    groups[0]?.label,
    "Onsdag 16.09.2026",
  );
});

test("behandlede datogrupper starter foldet sammen og fokuseret notifikation kan åbne sin gruppe", () => {
  const source =
    readFileSync(
      "app/(app)/staffing-requests/components/list/StaffingRequestsListSection.tsx",
      "utf8",
    );

  assert.match(
    source,
    /<details[\s\S]*?open=\{isOpen\}/,
  );
  assert.match(
    source,
    /const isOpen =[\s\S]*?isFocusedGroup \|\|[\s\S]*?expandedCompletedDateKeys\.has/,
  );
  assert.match(
    source,
    /1 forespørgsel/,
  );
  assert.match(
    source,
    /forespørgsler/,
  );
  assert.doesNotMatch(
    source,
    /firstCompletedRequestIndex/,
  );
  assert.match(
    source,
    /getStaffingRequestViewerStatus/,
  );
  assert.match(
    source,
    /getStatusStyle\(\s*viewerStatus/,
  );
  assert.match(
    source,
    /getStatusLabel\(\s*viewerStatus/,
  );
});

test("personligt afvist broadcast vises som behandlet uden at ændre den globale status", () => {
  const request = {
    ...makeRequest(
      8,
      "PENDING",
      "2026-09-22T14:00:00.000Z",
    ),
    targetUser: null,
    declines: [
      {
        userId: 7,
        declinedAt:
          "2026-09-14T19:17:00.000Z",
        user: {
          id: 7,
          firstName:
            "Test 3",
          lastName:
            "tester",
        },
      },
    ],
  };

  const employeeGroups =
    groupCompletedStaffingRequestsByShiftDate(
      [request],
      7,
      false,
    );

  assert.equal(
    request.status,
    "PENDING",
  );
  assert.equal(
    employeeGroups.length,
    1,
  );
  assert.deepEqual(
    employeeGroups[0]?.requests.map(
      (item) => item.id,
    ),
    [8],
  );
  assert.equal(
    groupCompletedStaffingRequestsByShiftDate(
      [request],
      9,
      false,
    ).length,
    0,
  );
  assert.equal(
    groupCompletedStaffingRequestsByShiftDate(
      [request],
      7,
      true,
    ).length,
    0,
  );
});
