import assert from "node:assert/strict";
import test from "node:test";

import {
  createEmptyDashboardSourceHistory,
  formatDashboardSourceAge,
  formatDashboardSourceDateTime,
  formatDashboardSourceTime,
  summarizeDashboardSources,
} from "../../app/(app)/dashboard/helpers/dashboardSourceHealth";
import type { DashboardSourceStatusMap } from "../../app/(app)/dashboard/types";

const history = createEmptyDashboardSourceHistory();

function statuses(
  overrides: Partial<DashboardSourceStatusMap> = {},
): DashboardSourceStatusMap {
  return {
    shifts: { state: "disabled" },
    timeEntries: { state: "disabled" },
    leaveRequests: { state: "disabled" },
    shiftTrades: { state: "disabled" },
    movies: { state: "disabled" },
    ...overrides,
  };
}

test("tom historik initialiserer alle kilder ens", () => {
  for (const entry of Object.values(history)) {
    assert.deepEqual(entry, {
      lastSuccessfulAt: null,
      lastAttemptedAt: null,
      consecutiveFailures: 0,
    });
  }
});

test("ingen aktive kilder får deaktiveret samlet status", () => {
  const result = summarizeDashboardSources(statuses(), history);
  assert.equal(result.enabled, 0);
  assert.equal(result.tone, "disabled");
  assert.equal(result.text, "Ingen aktive datakilder");
});

test("alle utilgængelige kilder får samlet fejlstatus", () => {
  const result = summarizeDashboardSources(
    statuses({
      shifts: { state: "unavailable" },
      movies: { state: "unavailable" },
    }),
    history,
  );
  assert.equal(result.enabled, 2);
  assert.equal(result.unavailable, 2);
  assert.equal(result.tone, "unavailable");
  assert.equal(result.text, "Ingen datakilder er tilgængelige");
});

test("blandet frisk og gammel data giver degraderet status", () => {
  const localHistory = createEmptyDashboardSourceHistory();
  localHistory.shifts.lastSuccessfulAt = "2026-07-29T08:00:00.000Z";
  localHistory.movies.lastSuccessfulAt = "2026-07-29T07:00:00.000Z";
  const result = summarizeDashboardSources(
    statuses({
      shifts: { state: "fresh" },
      movies: { state: "stale" },
    }),
    localHistory,
  );
  assert.equal(result.fresh, 1);
  assert.equal(result.stale, 1);
  assert.equal(result.degraded, 1);
  assert.equal(result.tone, "degraded");
  assert.equal(result.text, "1 af 2 datakilder er aktuelle");
  assert.equal(result.oldestSuccessfulAt, "2026-07-29T07:00:00.000Z");
});

test("alle friske kilder giver frisk status", () => {
  const result = summarizeDashboardSources(
    statuses({
      shifts: { state: "fresh" },
      movies: { state: "fresh" },
      leaveRequests: { state: "fresh" },
    }),
    history,
  );
  assert.equal(result.tone, "fresh");
  assert.equal(result.text, "3 af 3 datakilder er aktuelle");
});

test("relativ alder håndterer centrale tidsgrænser", () => {
  const now = new Date("2026-07-29T10:00:00.000Z").getTime();
  assert.equal(formatDashboardSourceAge("2026-07-29T09:59:50.000Z", now), "lige nu");
  assert.equal(
    formatDashboardSourceAge("2026-07-29T09:59:30.000Z", now),
    "for 30 sekunder siden",
  );
  assert.equal(formatDashboardSourceAge("2026-07-29T09:59:00.000Z", now), "for 1 minut siden");
  assert.equal(formatDashboardSourceAge("2026-07-29T08:00:00.000Z", now), "for 2 timer siden");
  assert.equal(formatDashboardSourceAge("2026-07-27T10:00:00.000Z", now), "for 2 dage siden");
  assert.equal(formatDashboardSourceAge(null, now), null);
  assert.equal(formatDashboardSourceAge("ugyldig", now), null);
});

test("absolutte tider afviser ugyldige værdier", () => {
  assert.equal(formatDashboardSourceTime(null), null);
  assert.equal(formatDashboardSourceTime("ugyldig"), null);
  assert.equal(formatDashboardSourceDateTime(null), null);
  assert.equal(formatDashboardSourceDateTime("ugyldig"), null);
  assert.match(formatDashboardSourceTime("2026-07-29T08:00:00.000Z") ?? "", /^\d{2}[.:]\d{2}[.:]\d{2}$/);
});
