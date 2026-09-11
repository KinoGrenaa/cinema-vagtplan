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

test("/home linker system og direkte bytter til korrekt kategori", () => {
  const home = read(
    "app/(app)/home/page.tsx",
  );

  assert.ok(
    home.includes(
      'linkUrl: "/messages/notifications?category=system"',
    ),
  );
  assert.ok(
    home.includes(
      'linkUrl: "/messages/notifications?category=directTrades"',
    ),
  );
});

test("notifikationsgrupper læser kategori fra URL ved navigation", () => {
  const groups = read(
    "app/(app)/messages/notifications/hooks/groups/useNotificationGroups.ts",
  );

  assert.ok(
    groups.includes(
      "new URLSearchParams(",
    ),
  );
  assert.ok(
    groups.includes(
      'window.location.search',
    ),
  );
  assert.ok(
    groups.includes(
      'requestedCategory !== "system"',
    ),
  );
  assert.ok(
    groups.includes(
      'requestedCategory !== "directTrades"',
    ),
  );
  assert.ok(
    groups.includes(
      "visibleCategories.includes(",
    ),
  );
  assert.ok(
    groups.includes(
      "setActiveCategory(",
    ),
  );
});
