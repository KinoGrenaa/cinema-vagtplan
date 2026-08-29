import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const header = read(
  "app/(app)/my-time/components/layout/MyTimeHeader.tsx",
);
const summary = read(
  "app/(app)/my-time/components/overview/MyTimeSummaryCards.tsx",
);

test("my-time skjuler standardfilterets gentagelse", () => {
  assert.match(
    header,
    /statusFilterSummary !== "Godkendte, Afventer, Skal rettes"/,
  );
  assert.match(
    header,
    /showFilterSummary &&/,
  );
  assert.doesNotMatch(
    header,
    /\{needsChangesCount\} kræver handling/,
  );
});

test("my-time viser lønperioden som en kompakt værktøjslinje", () => {
  assert.match(
    header,
    /mt-4 border-t border-gray-200 pt-4/,
  );
  assert.doesNotMatch(
    header,
    /mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4/,
  );
});

test("my-time statusoverblik er kompakt uden forklaringstekster", () => {
  assert.match(
    summary,
    /grid overflow-hidden rounded-2xl border/,
  );
  assert.match(
    summary,
    />\s*Godkendt\s*</,
  );
  assert.match(
    summary,
    />\s*Afventer\s*</,
  );
  assert.match(
    summary,
    />\s*Kræver handling\s*</,
  );
  assert.doesNotMatch(
    summary,
    /Tæller med i løngrundlaget/,
  );
  assert.doesNotMatch(
    summary,
    /Ikke med i løn før godkendelse/,
  );
  assert.doesNotMatch(
    summary,
    /Registreringer sendt retur til rettelse/,
  );
});

const entryCard = read(
  "app/(app)/my-time/components/list/MyTimeEntryCard.tsx",
);

test("my-time registreringskort viser tiden på én kompakt linje", () => {
  assert.match(
    entryCard,
    /formatEntryTimeRange\(entry\)/,
  );
  assert.doesNotMatch(
    entryCard,
    /<dl className=/,
  );
  assert.doesNotMatch(
    entryCard,
    />\s*Mødetid\s*</,
  );
  assert.doesNotMatch(
    entryCard,
    />\s*Fyraften\s*</,
  );
  assert.doesNotMatch(
    entryCard,
    />\s*Timer\s*</,
  );
  assert.doesNotMatch(
    entryCard,
    />\s*Status\s*</,
  );
});

test("my-time viser næste dato tydeligt ved arbejde over midnat", () => {
  assert.match(
    entryCard,
    /isSameLocalDay\(entry\.clockIn, entry\.clockOut\)/,
  );
  assert.match(
    entryCard,
    /formatShortDate\(entry\.clockOut\)/,
  );
});

test("my-time registreringskort bruger kompakte noter og handlinger", () => {
  assert.match(
    entryCard,
    /AutomaticTimeRegistrationNotice[\s\S]*inline/,
  );
  assert.match(
    entryCard,
    /<span className="font-semibold text-gray-800 dark:text-gray-200">\s*Note:/,
  );
  assert.match(
    entryCard,
    /px-3 py-1\.5 text-xs font-semibold/,
  );
  assert.doesNotMatch(
    entryCard,
    /mt-4 space-y-3 rounded-xl border border-gray-200 bg-white\/80 p-4 text-sm/,
  );
});

const automaticNotice = read(
  "app/components/time-entries/AutomaticTimeRegistrationNotice.tsx",
);

test("my-time handlinger ligger på samme række som tidslinjen", () => {
  assert.match(
    entryCard,
    /mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between/,
  );
  assert.match(
    entryCard,
    /formatEntryTimeRange\(entry\)[\s\S]*onHistory\(entry\)[\s\S]*onEdit\(entry\)/,
  );
  assert.doesNotMatch(
    entryCard,
    /mt-3 flex flex-wrap justify-end gap-2/,
  );
});

test("automatisk udfyldning kan vises som diskret tekstlinje", () => {
  assert.match(
    automaticNotice,
    /inline\?: boolean/,
  );
  assert.match(
    automaticNotice,
    /if \(inline\)/,
  );
  assert.match(
    automaticNotice,
    /text-xs font-medium text-blue-700/,
  );
  assert.match(
    entryCard,
    /automaticClockOut=\{entry\.automaticClockOut\}[\s\S]*inline/,
  );
});

const dayGroups = read(
  "app/(app)/my-time/components/list/MyTimeDayGroupsSection.tsx",
);

test("my-time dagsrækkens fokusmarkering følger kortets afrundede hjørner", () => {
  assert.match(
    dayGroups,
    /\$\{isExpanded \? "rounded-t-2xl" : "rounded-2xl"\}/,
  );
  assert.match(
    dayGroups,
    /focus-visible:ring-inset/,
  );
});
