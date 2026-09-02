import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appMenu = readFileSync(
  "app/components/AppMenu.tsx",
  "utf8",
);

const realtimeBadges = readFileSync(
  "app/hooks/useRealtimeBadges.ts",
  "utf8",
);

test("menuen viser egne tidsregistreringer der kræver handling som badge", () => {
  assert.match(
    appMenu,
    /const timeAndLeaveBadgeCount =[\s\S]*?leaveRequestCount \+[\s\S]*?timeEntryActionCount/,
  );

  assert.match(
    appMenu,
    /id: "time-and-leave"[\s\S]*?badge: timeAndLeaveBadgeCount/,
  );

  assert.match(
    appMenu,
    /href: "\/my-time"[\s\S]*?label: "Mine timer"[\s\S]*?badge: timeEntryActionCount/,
  );

  assert.match(
    realtimeBadges,
    /\/time-entries\/me-action-required-count/,
  );

  assert.match(
    realtimeBadges,
    /onTimeEntry:[\s\S]*?timeTrackingEnabled[\s\S]*?refreshBadges/,
  );

  assert.match(
    realtimeBadges,
    /timeEntryActionCount:[\s\S]*?timeTrackingEnabled/,
  );
});
