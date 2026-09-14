import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/shift-trades/hooks/data/useShiftTradesData.ts",
  "utf8",
);

test("notification-target uden normal historikdeltagelse tælles med", () => {
  assert.match(
    source,
    /function isAdditionalHistoryTarget\(/,
  );
  assert.match(
    source,
    /trade\.offeredByUserId !==\s*userId/,
  );
  assert.match(
    source,
    /trade\.acceptedByUserId !==\s*userId/,
  );
  assert.match(
    source,
    /trade\.targetUserId !==\s*userId/,
  );
  assert.match(
    source,
    /isAdditionalHistoryTarget\(\s*target,\s*user\.id,/,
  );
});

test("hent ældre historik kan ikke sænke en target-justeret total", () => {
  assert.match(
    source,
    /setHistoryTotalCount\(\s*\(current\) =>\s*Math\.max\(/,
  );
});
