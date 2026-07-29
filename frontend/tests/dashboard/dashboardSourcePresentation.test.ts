import assert from "node:assert/strict";
import test from "node:test";

import {
  combineDashboardSourceStatuses,
  getDashboardSourceLabel,
  getDashboardSourceUnavailableText,
  isDashboardSourceReadable,
  isDashboardSourceStale,
} from "../../app/(app)/dashboard/helpers/dashboardSourcePresentation";

test("kun aktuelle og tidligere data er læsbare", () => {
  assert.equal(isDashboardSourceReadable({ state: "fresh" }), true);
  assert.equal(isDashboardSourceReadable({ state: "stale" }), true);
  assert.equal(isDashboardSourceReadable({ state: "unavailable" }), false);
  assert.equal(isDashboardSourceReadable({ state: "disabled" }), false);
  assert.equal(isDashboardSourceStale({ state: "stale" }), true);
});

test("kombineret status prioriterer utilgængelig over tidligere data", () => {
  assert.deepEqual(
    combineDashboardSourceStatuses([
      { state: "fresh" },
      { state: "unavailable", message: "Filmprogram mangler" },
      { state: "stale" },
    ]),
    { state: "unavailable", message: "Filmprogram mangler" },
  );
});

test("flere fejlbeskeder samles uden tomme værdier", () => {
  assert.deepEqual(
    combineDashboardSourceStatuses([
      { state: "unavailable", message: "Vagtplan mangler" },
      { state: "unavailable", message: "" },
      { state: "unavailable", message: "Filmprogram mangler" },
    ]),
    {
      state: "unavailable",
      message: "Vagtplan mangler Filmprogram mangler",
    },
  );
});

test("kun deaktiverede kilder giver deaktiveret status", () => {
  assert.deepEqual(
    combineDashboardSourceStatuses([
      { state: "disabled" },
      { state: "disabled" },
    ]),
    { state: "disabled" },
  );
  assert.deepEqual(
    combineDashboardSourceStatuses([
      { state: "fresh" },
      { state: "stale" },
    ]),
    { state: "stale" },
  );
});

test("statusetiketter og fallbacktekst er stabile", () => {
  assert.equal(getDashboardSourceLabel("fresh"), "Aktuelle data");
  assert.equal(getDashboardSourceLabel("stale"), "Tidligere data");
  assert.equal(getDashboardSourceLabel("unavailable"), "Ikke tilgængelig");
  assert.equal(getDashboardSourceLabel("disabled"), "Deaktiveret");
  assert.equal(
    getDashboardSourceUnavailableText(
      { state: "unavailable", message: "  Konkret fejl  " },
      "Fallback",
    ),
    "Konkret fejl",
  );
  assert.equal(
    getDashboardSourceUnavailableText({ state: "unavailable" }, "Fallback"),
    "Fallback",
  );
});
