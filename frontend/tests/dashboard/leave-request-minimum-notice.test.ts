import assert from "node:assert/strict";
import test from "node:test";

import {
  getLeaveRequestMinimumDate,
  normalizeLeaveRequestMinimumNoticeDays,
} from "../../app/(app)/leave-requests/helpers/core/leaveRequestMinimumNotice";

const referenceDate =
  new Date(
    "2026-08-20T08:14:00.000Z",
  );

test("0 dages varsel tillader dags dato i København", () => {
  assert.equal(
    getLeaveRequestMinimumDate(
      0,
      referenceDate,
    ),
    "2026-08-20",
  );
});

test("1 og 2 dages varsel regnes som kalenderdage", () => {
  assert.equal(
    getLeaveRequestMinimumDate(
      1,
      referenceDate,
    ),
    "2026-08-21",
  );
  assert.equal(
    getLeaveRequestMinimumDate(
      2,
      referenceDate,
    ),
    "2026-08-22",
  );
});

test("kalenderdage er stabile hen over dansk sommertidsskifte", () => {
  const beforeWinterTime =
    new Date(
      "2026-10-24T12:00:00.000Z",
    );

  assert.equal(
    getLeaveRequestMinimumDate(
      2,
      beforeWinterTime,
    ),
    "2026-10-26",
  );
});

test("ugyldigt varsel falder tilbage til nuværende standard på 1 dag", () => {
  assert.equal(
    normalizeLeaveRequestMinimumNoticeDays(
      -1,
    ),
    1,
  );
  assert.equal(
    normalizeLeaveRequestMinimumNoticeDays(
      1.5,
    ),
    1,
  );
});
