import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const minuteStepHook =
  readFileSync(
    "app/hooks/useTimeEntryMinuteStep.ts",
    "utf8",
  );

const scheduleData =
  readFileSync(
    "app/(app)/schedule/hooks/data/useSchedule.ts",
    "utf8",
  );

const schedulePage =
  readFileSync(
    "app/(app)/schedule/page.tsx",
    "utf8",
  );

const scheduleModals =
  readFileSync(
    "app/(app)/schedule/components/time-registration/TimeRegistrationModals.tsx",
    "utf8",
  );

const myTimePage =
  readFileSync(
    "app/(app)/my-time/page.tsx",
    "utf8",
  );

const myTimeModals =
  readFileSync(
    "app/(app)/my-time/components/modals/MyTimeModals.tsx",
    "utf8",
  );

const myTimeEditModal =
  readFileSync(
    "app/(app)/my-time/components/modals/MyTimeEditModal.tsx",
    "utf8",
  );

const timeApprovalPage =
  readFileSync(
    "app/(app)/time-approval/page.tsx",
    "utf8",
  );

const sharedEditModal =
  readFileSync(
    "app/components/modals/time-entries/TimeEntryEditModal.tsx",
    "utf8",
  );

const shiftForm =
  readFileSync(
    "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
    "utf8",
  );

const staffingModal =
  readFileSync(
    "app/(app)/schedule/components/staffing/StaffingRequestModal.tsx",
    "utf8",
  );

test(
  "registreringspræcision hentes fra aktiv biograf med sikker standard på 1 minut",
  () => {
    assert.match(
      minuteStepHook,
      /apiFetch\(\s*`\/cinemas\/\$\{cinemaId\}`/,
    );
    assert.match(
      minuteStepHook,
      /value === 5 \|\|\s*value === 15[\s\S]*\? value\s*:\s*1/,
    );
    assert.match(
      minuteStepHook,
      /useState<TimeEntryMinuteStep>[\s\S]*\(\s*1,?\s*\)/,
    );
  },
);

test(
  "schedule bruger biografens registreringspræcision i begge registreringsflows",
  () => {
    assert.match(
      scheduleData,
      /return \{[\s\S]*activeCinemaId,[\s\S]*shifts,/,
    );
    assert.match(
      schedulePage,
      /useTimeEntryMinuteStep\(\s*activeCinemaId,?\s*\)/,
    );
    assert.match(
      schedulePage,
      /<TimeRegistrationModal[\s\S]*minuteStep=\{timeEntryMinuteStep\}/,
    );
    assert.match(
      schedulePage,
      /<ManualTimeRegistrationModal[\s\S]*minuteStep=\{timeEntryMinuteStep\}/,
    );

    const pickerBindings =
      scheduleModals.match(
        /minuteStep=\{minuteStep\}/g,
      ) ?? [];

    assert.equal(
      pickerBindings.length,
      4,
    );
  },
);

test(
  "my-time og time-approval bruger samme biografspecifikke registreringspræcision",
  () => {
    assert.match(
      myTimePage,
      /useTimeEntryMinuteStep\(\s*user\?\.cinemaId \?\? null,?\s*\)/,
    );
    assert.match(
      myTimePage,
      /timeEntryMinuteStep=\{timeEntryMinuteStep\}/,
    );
    assert.match(
      myTimeModals,
      /minuteStep=\{timeEntryMinuteStep\}/,
    );
    assert.equal(
      (
        myTimeEditModal.match(
          /minuteStep=\{minuteStep\}/g,
        ) ?? []
      ).length,
      2,
    );

    assert.match(
      timeApprovalPage,
      /user\?\.role === "MASTER"[\s\S]*selectedMasterCinemaId[\s\S]*user\?\.cinemaId \?\?\s*null/,
    );
    assert.match(
      timeApprovalPage,
      /useTimeEntryMinuteStep\(\s*activeCinemaId,?\s*\)/,
    );
    assert.match(
      timeApprovalPage,
      /minuteStep=\{timeEntryMinuteStep\}/,
    );
    assert.equal(
      (
        sharedEditModal.match(
          /minuteStep=\{minuteStep\}/g,
        ) ?? []
      ).length,
      2,
    );
  },
);

test(
  "vagtredigering og bemandingsforespørgsler beholder pickerens standard på 1 minut",
  () => {
    assert.doesNotMatch(
      shiftForm,
      /minuteStep=/,
    );
    assert.doesNotMatch(
      staffingModal,
      /minuteStep=/,
    );
  },
);
