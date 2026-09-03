import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const dayGroupsSource =
  readFileSync(
    "app/(app)/my-time/components/list/MyTimeDayGroupsSection.tsx",
    "utf8",
  );

const entryCardSource =
  readFileSync(
    "app/(app)/my-time/components/list/MyTimeEntryCard.tsx",
    "utf8",
  );

test(
  "my-time fremhæver dagsbadge med krævet handling som tydelig orange handling",
  () => {
    assert.match(
      dayGroupsSource,
      /part\.startsWith\("Kræver handling:"\)[\s\S]*border-orange-600 bg-orange-600 text-white[\s\S]*dark:border-orange-500 dark:bg-orange-500 dark:text-gray-950/,
    );

    assert.doesNotMatch(
      dayGroupsSource,
      /part\.startsWith\("Kræver handling:"\)[\s\S]*border-orange-300 bg-orange-50 text-orange-900/,
    );
  },
);

test(
  "my-time fremhæver Skal rettes-status som tydelig orange handling",
  () => {
    assert.match(
      entryCardSource,
      /status === "NEEDS_CHANGES"[\s\S]*border-orange-600 bg-orange-600 text-white[\s\S]*dark:border-orange-500 dark:bg-orange-500 dark:text-gray-950/,
    );

    assert.doesNotMatch(
      entryCardSource,
      /status === "NEEDS_CHANGES"[\s\S]*border-orange-300 bg-orange-100 text-orange-900/,
    );
  },
);
