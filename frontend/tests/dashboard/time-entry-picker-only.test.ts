import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const timePicker =
  readFileSync(
    "app/components/date/ProjectTimePicker.tsx",
    "utf8",
  );

const dateTimePicker =
  readFileSync(
    "app/components/date/ProjectDateTimePicker.tsx",
    "utf8",
  );

const registrationModals =
  readFileSync(
    "app/(app)/schedule/components/time-registration/TimeRegistrationModals.tsx",
    "utf8",
  );

const myTimeEditModal =
  readFileSync(
    "app/(app)/my-time/components/modals/MyTimeEditModal.tsx",
    "utf8",
  );

const adminEditModal =
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
  "fælles klokkeslætsvælger kan sættes i picker-only uden at ændre standardadfærden",
  () => {
    assert.match(
      timePicker,
      /pickerOnly\?: boolean;/,
    );
    assert.match(
      timePicker,
      /pickerOnly = false,/,
    );
    assert.match(
      timePicker,
      /readOnly=\{pickerOnly\}/,
    );
    assert.match(
      timePicker,
      /if \(pickerOnly\) \{[\s\S]*setOpen\(true\);/,
    );
  },
);

test(
  "fælles dato- og tidsvælger sender picker-only videre til klokkeslættet",
  () => {
    assert.match(
      dateTimePicker,
      /pickerOnly\?: boolean;/,
    );
    assert.match(
      dateTimePicker,
      /pickerOnly = false,/,
    );
    assert.match(
      dateTimePicker,
      /pickerOnly=\{pickerOnly\}/,
    );
  },
);

test(
  "alle faktiske tidsregistreringsfelter er picker-only",
  () => {
    assert.equal(
      (
        registrationModals.match(
          /\bpickerOnly\b/g,
        ) ?? []
      ).length,
      4,
    );

    assert.equal(
      (
        myTimeEditModal.match(
          /\bpickerOnly\b/g,
        ) ?? []
      ).length,
      2,
    );

    assert.equal(
      (
        adminEditModal.match(
          /\bpickerOnly\b/g,
        ) ?? []
      ).length,
      2,
    );
  },
);

test(
  "tidsregistreringsflows viser ikke generisk Ryd-handling",
  () => {
    assert.doesNotMatch(
      registrationModals,
      /\bclearable\b/,
    );
    assert.doesNotMatch(
      myTimeEditModal,
      /\bclearable\b/,
    );
    assert.doesNotMatch(
      adminEditModal,
      /\bclearable\b/,
    );
  },
);

test(
  "vagtredigering og bemandingsforespørgsler beholder fri tidsindtastning",
  () => {
    assert.doesNotMatch(
      shiftForm,
      /\bpickerOnly\b/,
    );
    assert.doesNotMatch(
      staffingModal,
      /\bpickerOnly\b/,
    );
  },
);
