import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(path, "utf8");

const picker = read(
  "app/components/employees/EmployeePickerModal.tsx",
);
const avatar = read(
  "app/components/employees/EmployeeAvatar.tsx",
);
const schedule = read(
  "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
);
const templateAssignments = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionAssignments.tsx",
);
const templateCardHelpers = read(
  "app/(app)/schedule-templates/helpers/job-functions/scheduleTemplateJobFunctionCardHelpers.ts",
);

test("fælles medarbejdervælger har søgning og bekræftet valg", () => {
  assert.match(
    picker,
    /type="search"/,
  );
  assert.match(
    picker,
    /role="listbox"/,
  );
  assert.match(
    picker,
    /aria-selected/,
  );
  assert.match(
    picker,
    /await onConfirm/,
  );
});

test("schedule bruger fælles medarbejdervælger og bevarer fraværsadvarsler", () => {
  assert.match(
    schedule,
    /EmployeePickerModal/,
  );
  assert.match(
    schedule,
    /Vælg medarbejder/,
  );
  assert.match(
    schedule,
    /Fjern tildeling/,
  );
  assert.match(
    schedule,
    /godkendt fri/,
  );
  assert.match(
    schedule,
    /afventende fraværsansøgning/i,
  );
});

test("schedule templates bruger fælles medarbejdervælger og overlapstekster", () => {
  assert.match(
    templateAssignments,
    /EmployeePickerModal/,
  );
  assert.match(
    templateAssignments,
    /Tilføj fast medarbejder/,
  );
  assert.match(
    templateAssignments,
    /Muligt overlap/,
  );
  assert.match(
    templateAssignments,
    /Har også/,
  );
});

test("fælles medarbejdervælger bruger bred modal og tre kolonner på desktop", () => {
  assert.match(
    picker,
    /width="xl"/,
  );
  assert.match(
    picker,
    /grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3/,
  );
  assert.match(
    picker,
    /EmployeeAvatar/,
  );
  assert.match(
    picker,
    />\s*✓\s*</,
  );
  assert.doesNotMatch(
    picker,
    />\s*Søg\s*</,
  );
});

test("fælles medarbejdervælger viser profilbillede med initialer som fallback", () => {
  assert.match(
    picker,
    /profileImage\?: string \| null/,
  );
  assert.match(
    picker,
    /profileImage=\{\s*option\.profileImage/,
  );
  assert.match(
    avatar,
    /NEXT_PUBLIC_API_URL/,
  );
  assert.match(
    avatar,
    /<img/,
  );
  assert.match(
    avatar,
    /object-cover/,
  );
  assert.match(
    avatar,
    /onError/,
  );
  assert.match(
    avatar,
    /getEmployeeInitials/,
  );
});

test("de tre centrale vagtflows sender profilbilledet videre til vælgeren", () => {
  assert.match(
    schedule,
    /profileImage:\s*user\.profileImage\s*\?\?\s*null/,
  );
  assert.match(
    templateAssignments,
    /profileImage:\s*employee\.profileImage\s*\?\?\s*null/,
  );
});

test("schedule-template helpertypen tillader profilbillede i medarbejdervælgeren", () => {
  assert.match(
    templateCardHelpers,
    /profileImage\?: string \| null/,
  );
});
