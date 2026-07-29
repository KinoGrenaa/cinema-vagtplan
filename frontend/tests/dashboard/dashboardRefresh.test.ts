import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_AUTO_REFRESH_INTERVAL_MS,
  formatDashboardRefreshCountdown,
  formatDashboardRefreshTime,
  getNextDashboardRefreshAt,
  getSecondsUntilDashboardRefresh,
  isDashboardUpdateFromPreviousDay,
} from "../../app/(app)/dashboard/helpers/dashboardRefresh";

test("næste automatiske opdatering ligger præcis fem minutter senere", () => {
  const start = "2026-07-29T08:00:00.000Z";
  assert.equal(
    getNextDashboardRefreshAt(start),
    "2026-07-29T08:05:00.000Z",
  );
  assert.equal(DASHBOARD_AUTO_REFRESH_INTERVAL_MS, 300_000);
});

test("ugyldige og manglende tidspunkter giver ingen plan", () => {
  assert.equal(getNextDashboardRefreshAt(null), null);
  assert.equal(getNextDashboardRefreshAt("ugyldig"), null);
  assert.equal(getSecondsUntilDashboardRefresh(null, Date.now()), null);
  assert.equal(getSecondsUntilDashboardRefresh("ugyldig", Date.now()), null);
});

test("nedtælling afrundes op og bliver aldrig negativ", () => {
  const next = "2026-07-29T08:00:10.100Z";
  const now = new Date("2026-07-29T08:00:00.000Z").getTime();
  assert.equal(getSecondsUntilDashboardRefresh(next, now), 11);
  assert.equal(
    getSecondsUntilDashboardRefresh(next, new Date("2026-07-29T08:01:00Z").getTime()),
    0,
  );
});

test("danske nedtællingstekster dækker grænserne", () => {
  assert.equal(formatDashboardRefreshCountdown(null), "efter første opdatering");
  assert.equal(formatDashboardRefreshCountdown(5), "om få sekunder");
  assert.equal(formatDashboardRefreshCountdown(30), "om 30 sekunder");
  assert.equal(formatDashboardRefreshCountdown(60), "om 1 minut");
  assert.equal(formatDashboardRefreshCountdown(61), "om 2 minutter");
});

test("samme københavnske dag genkendes, tidligere dag afvises", () => {
  assert.equal(isDashboardUpdateFromPreviousDay(new Date().toISOString()), false);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  assert.equal(isDashboardUpdateFromPreviousDay(twoDaysAgo), true);
});

test("opdateringstid formateres som dansk klokkeslæt", () => {
  const value = formatDashboardRefreshTime("2026-07-29T08:15:30.000Z");
  assert.match(value ?? "", /^\d{2}[.:]\d{2}[.:]\d{2}$/);
  assert.equal(formatDashboardRefreshTime(null), null);
});
