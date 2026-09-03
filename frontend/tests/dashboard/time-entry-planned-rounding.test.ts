import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { roundLocalDateTimeToMinuteStep } from "../../app/utils/dateTime";

const hook = readFileSync(
  "app/(app)/schedule/hooks/actions/useScheduleTimeRegistration.ts",
  "utf8",
);
const modal = readFileSync(
  "app/(app)/schedule/components/time-registration/TimeRegistrationModals.tsx",
  "utf8",
);
const page = readFileSync(
  "app/(app)/schedule/page.tsx",
  "utf8",
);

test("planlagt registrering afrundes til valgt minutpræcision", () => {
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T18:15", 15), "2026-09-03T18:15");
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T22:05", 15), "2026-09-03T22:00");
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T22:08", 15), "2026-09-03T22:15");
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T22:07", 5), "2026-09-03T22:05");
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T22:07", 1), "2026-09-03T22:07");
});

test("afrunding over midnat flytter datoen korrekt", () => {
  assert.equal(roundLocalDateTimeToMinuteStep("2026-09-03T23:55", 15), "2026-09-04T00:00");
});

test("schedule bruger afrundet plan til både prefill og afvigelseskontrol", () => {
  assert.match(page, /minuteStep:\s*timeEntryMinuteStep/);
  assert.match(hook, /function plannedRegistrationTime\([\s\S]*roundLocalDateTimeToMinuteStep/);
  assert.match(hook, /const plannedStart\s*=\s*plannedRegistrationTime/);
  assert.match(hook, /const plannedEnd\s*=\s*plannedRegistrationTime/);
  assert.match(hook, /setClockOutTime\([\s\S]*plannedRegistrationTime/);
  assert.match(modal, /setClockInTime\([\s\S]*roundLocalDateTimeToMinuteStep/);
  assert.match(modal, /setClockOutTime\([\s\S]*roundLocalDateTimeToMinuteStep/);
});

test(
  "schedule forklarer synlig afrunding af planlagt tid",
  () => {
    assert.match(
      modal,
      /function getPlannedRoundingMessage/,
    );

    assert.match(
      modal,
      /Planlagt /,
    );

    assert.match(
      modal,
      / afrundes til /,
    );

    assert.match(
      modal,
      /-minutters registreringsregel\./,
    );

    assert.match(
      modal,
      /clockInRoundingMessage \? \(/,
    );

    assert.match(
      modal,
      /clockOutRoundingMessage \? \(/,
    );

    assert.match(
      modal,
      /crossesDate[\s\S]*næste dag/,
    );

    assert.match(
      modal,
      /minuteStep === 1[\s\S]*plannedValue === roundedValue/,
    );

    const manualIndex =
      modal.indexOf(
        "export function ManualTimeRegistrationModal",
      );

    assert.ok(
      manualIndex >= 0,
    );

    assert.doesNotMatch(
      modal.slice(
        manualIndex,
      ),
      /clock(?:In|Out)RoundingMessage|getPlannedRoundingMessage/,
    );

    const ordinaryModal =
      modal.slice(
        modal.indexOf(
          "export function TimeRegistrationModal",
        ),
        manualIndex,
      );

    const clockInHelpIndex =
      ordinaryModal.indexOf(
        "{clockInRoundingMessage ? (",
      );

    const clockOutHelpIndex =
      ordinaryModal.indexOf(
        "{clockOutRoundingMessage ? (",
      );

    const clockOutLabelIndex =
      ordinaryModal.indexOf(
        "Faktisk fyraften",
      );

    assert.ok(
      clockInHelpIndex >= 0,
    );

    assert.ok(
      clockOutHelpIndex >
        clockOutLabelIndex,
    );

    assert.equal(
      ordinaryModal.slice(
        0,
        clockOutLabelIndex,
      ).includes(
        "{clockOutRoundingMessage ? (",
      ),
      false,
    );
  },
);
