import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const frontendRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(
      frontendRoot,
      relativePath,
    ),
    "utf8",
  );
}

test("læst-handlinger beder menu-badges om straks at refreshe", () => {
  const notifications = read(
    "app/hooks/useNotifications.ts",
  );

  const eventOccurrences =
    notifications.match(
      /notificationBadgesRefresh/g,
    ) ?? [];

  assert.equal(
    eventOccurrences.length,
    2,
  );

  assert.ok(
    notifications.includes(
      "await markNotificationAsRead(",
    ),
  );
  assert.ok(
    notifications.includes(
      "await markNotificationCategoryAsRead(",
    ),
  );
  assert.ok(
    notifications.includes(
      'new Event(\n              "notificationBadgesRefresh"',
    ),
  );
});

test("useRealtimeBadges lytter på lokalt refresh-signal og rydder listener op", () => {
  const badges = read(
    "app/hooks/useRealtimeBadges.ts",
  );

  assert.ok(
    badges.includes(
      'window.addEventListener(\n      "notificationBadgesRefresh"',
    ),
  );
  assert.ok(
    badges.includes(
      'window.removeEventListener(\n        "notificationBadgesRefresh"',
    ),
  );
  assert.ok(
    badges.includes(
      "void refreshBadges();",
    ),
  );
  assert.ok(
    badges.includes(
      "}, [refreshBadges]);",
    ),
  );
});
