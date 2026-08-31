import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const assignments = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionAssignments.tsx",
);
const card = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionCard.tsx",
);
const section = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionsSection.tsx",
);
const settings = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionSettings.tsx",
);
const form = read(
  "app/(app)/schedule-templates/components/job-functions/ScheduleTemplateJobFunctionForm.tsx",
);
const createModal = read(
  "app/(app)/schedule-templates/components/modals/ScheduleTemplateCreateModal.tsx",
);
const daySettings = read(
  "app/(app)/schedule-templates/components/selected/ScheduleTemplateDaySettings.tsx",
);
const helper = read(
  "app/(app)/schedule-templates/helpers/job-functions/scheduleTemplateJobFunctionCardHelpers.ts",
);

test("schedule templates skjuler tekniske sorteringsfelter", () => {
  for (const source of [settings, form, createModal, daySettings]) {
    assert.doesNotMatch(source, />\s*Sortering\s*</);
  }
});

test("jobfunktionsnoten er fjernet fra den almindelige skabelon-UI", () => {
  assert.doesNotMatch(settings, />\s*Note\s*</);
  assert.doesNotMatch(form, />\s*Note\s*</);
  assert.doesNotMatch(card, /\{item\.note && \(/);
});

test("samme medarbejder kan vælges på flere vagter samme ugedag med visuel advarsel", () => {
  assert.doesNotMatch(
    section,
    /assignedUserIdsForDay/,
  );
  assert.doesNotMatch(
    assignments,
    /!unavailableUserIds\.has\(/,
  );
  assert.match(
    assignments,
    /har også/i,
  );
  assert.match(
    assignments,
    /muligt overlap/i,
  );
  assert.match(
    assignments,
    /De endelige tider afhænger af filmprogrammet/,
  );
});

test("primær redigering bruger vagtbegrebet", () => {
  assert.match(
    section,
    />\s*Vagter\s*</,
  );
  assert.match(form, /Tilføj vagt/);
});

test("potentielt overlap vurderes konservativt ud fra jobfunktionernes tidsregler", () => {
  assert.match(
    helper,
    /mayTemplateJobFunctionsOverlap/,
  );
  assert.match(
    helper,
    /leftEnd <= rightStart/,
  );
  assert.match(
    helper,
    /rightEnd <= leftStart/,
  );
  assert.match(
    helper,
    /anchor !== "FIXED_TIME"/,
  );
});

test("fast bemanding kan aflæses uden at åbne detaljer", () => {
  assert.match(
    card,
    /assignedNames/,
  );
  assert.match(
    card,
    /Fast medarbejder:/,
  );
  assert.match(
    card,
    /Faste medarbejdere:/,
  );
  assert.match(
    card,
    /Ingen fast medarbejder/,
  );
  assert.match(
    card,
    /assignedNames\.join\(" · "\)/,
  );
});

test("medarbejdernavne fremhæves med farve og fed skrift i oversigten", () => {
  assert.match(
    card,
    /font-bold text-blue-700 dark:text-blue-300/,
  );
  assert.match(
    card,
    /assignedNames\.join\(" · "\)/,
  );
});

test("vagtoversigten skjuler standard-tidsvinduet og bruger forestillinger ved begrænsning", () => {
  assert.doesNotMatch(
    helper,
    /Medregner alle filmstarter/,
  );
  assert.doesNotMatch(
    helper,
    /Medregner filmstarter/,
  );
  assert.match(
    helper,
    /Forestillinger /,
  );
  assert.match(
    helper,
    /restrictMovieStartsToWindow\) return null/,
  );
  assert.match(
    card,
    /timingSummary &&/,
  );
  assert.doesNotMatch(
    card,
    /\{assignedCount\}\/\s*\{item\.requiredCount\}/,
  );
});

test("åben-vagt-forklaringen vises kun når vagtens detaljer er åbne", () => {
  assert.match(
    card,
    /expanded && missingCount > 0 && \(/,
  );
  assert.match(
    card,
    /Åben vagt fra skabelonen/,
  );
  assert.match(
    card,
    /Ingen fast medarbejder/,
  );
});

test("ugedagsområdet er kompakt og bruger vagtbegrebet", () => {
  assert.doesNotMatch(
    daySettings,
    /oprettes uden\s+fast medarbejder på denne ugedag/,
  );
  assert.doesNotMatch(
    daySettings,
    />\s*Ugedag\s*</,
  );
  assert.match(
    daySettings,
    /Kopiér dag/,
  );
  assert.match(
    daySettings,
    /Aktiv ugedag/,
  );
  assert.match(
    daySettings,
    />\s*Bemærkning\s*</,
  );
  assert.match(
    daySettings,
    /Gem dag/,
  );
  assert.doesNotMatch(
    section,
    /jobfunktioner/,
  );
});

test("ugedagsfaner viser vagter frem for jobfunktioner", () => {
  const tabs = read(
    "app/(app)/schedule-templates/components/selected/ScheduleTemplateWeekdayTabs.tsx",
  );
  assert.doesNotMatch(
    tabs,
    />\s*jobfunktioner\s*</,
  );
  assert.match(
    tabs,
    /\? "vagt"\s*: "vagter"/,
  );
});

test("skabelonforklaringer bruger vagtbegrebet", () => {
  const intro = read(
    "app/(app)/schedule-templates/components/layout/ScheduleTemplatesPageIntro.tsx",
  );
  const list = read(
    "app/(app)/schedule-templates/components/overview/ScheduleTemplateList.tsx",
  );
  const editor = read(
    "app/(app)/schedule-templates/components/editor/ScheduleTemplateEditorPanel.tsx",
  );
  const openShiftSummary = read(
    "app/(app)/schedule-templates/components/selected/ScheduleTemplateOpenShiftSummary.tsx",
  );

  assert.doesNotMatch(
    intro,
    /ugedage, jobfunktioner/,
  );
  assert.doesNotMatch(
    list,
    /ugedage og jobfunktioner/,
  );
  assert.doesNotMatch(
    editor,
    /ugedage og\s+jobfunktioner/,
  );
  assert.doesNotMatch(
    openShiftSummary,
    /jobFunctionCount\} jobfunktioner/,
  );
});

test("editor-kaldet sender ikke en fjernet selectedDayGapSummary-prop", () => {
  const pageContent = read(
    "app/(app)/schedule-templates/components/layout/ScheduleTemplatesPageContent.tsx",
  );
  const editor = read(
    "app/(app)/schedule-templates/components/editor/ScheduleTemplateEditorPanel.tsx",
  );

  assert.doesNotMatch(
    pageContent,
    /selectedDayGapSummary=/,
  );
  assert.doesNotMatch(
    editor,
    /selectedDayGapSummary:/,
  );
});

test("vagtafsnittet har én enkel overskrift", () => {
  assert.doesNotMatch(
    section,
    /Vagter på/,
  );
  assert.doesNotMatch(
    section,
    /Vagter fra skabelonen/,
  );
  assert.match(
    section,
    />\s*Vagter\s*</,
  );
  assert.match(
    section,
    /Det er valgfrit at vælge en/,
  );
  assert.match(
    section,
    /Uden fast\s+medarbejder bliver\s+vagten åben/,
  );
});

test("åbne vagter er sekundær status i skabelonredigeringen", () => {
  const pageContent = read(
    "app/(app)/schedule-templates/components/layout/ScheduleTemplatesPageContent.tsx",
  );
  const selectedHeader = read(
    "app/(app)/schedule-templates/components/selected/ScheduleTemplateSelectedHeader.tsx",
  );
  const list = read(
    "app/(app)/schedule-templates/components/overview/ScheduleTemplateList.tsx",
  );
  const tabs = read(
    "app/(app)/schedule-templates/components/selected/ScheduleTemplateWeekdayTabs.tsx",
  );

  assert.doesNotMatch(
    pageContent,
    /ScheduleTemplateSummaryCards/,
  );
  assert.doesNotMatch(
    selectedHeader,
    /ScheduleTemplateOpenShiftSummary/,
  );
  assert.match(
    list,
    /formatOpenShiftText\(templateGapSummary\.missingShiftCount\)/,
  );
  assert.match(
    tabs,
    /formatOpenShiftText\(\s*dayGapSummary\.missingShiftCount/,
  );
});

test("schedule templates viser kun medarbejdere med den konkrete jobfunktion", () => {
  assert.match(
    assignments,
    /item\.jobFunction\s*\.userJobFunctions/,
  );
  assert.match(
    assignments,
    /qualifiedUserIds\.has\(\s*employee\.id/,
  );
});
