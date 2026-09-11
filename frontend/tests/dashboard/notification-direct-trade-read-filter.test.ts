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

test("Direkte bytter kan skjule læste beskeder uden at skjule åbne tilbud", () => {
  const groups = read(
    "app/(app)/notifications/hooks/groups/useNotificationGroups.ts",
  );
  const overview = read(
    "app/(app)/notifications/components/overview/NotificationsOverview.tsx",
  );
  const page = read(
    "app/(app)/notifications/page.tsx",
  );

  assert.ok(
    groups.includes(
      "hideReadDirectTrades",
    ),
  );
  assert.ok(
    groups.includes(
      "visibleDirectResultNotifications",
    ),
  );
  assert.ok(
    groups.includes(
      "!notification.isRead",
    ),
  );

  // Åbne tilbud skal fortsat altid indgå.
  assert.ok(
    groups.includes(
      "...directTrades.map((trade) => ({",
    ),
  );

  // Kun resultatbeskederne filtreres.
  assert.ok(
    groups.includes(
      "...visibleDirectResultNotifications.map((notification) => ({",
    ),
  );

  // Kortets count er fortsat åbne tilbud + ULÆSTE resultater.
  assert.ok(
    groups.includes(
      "directTradeCount + directResultUnreadCount",
    ),
  );

  // Den viste count følger det lokale filter.
  assert.ok(
    groups.includes(
      "visibleDirectResultNotifications.length",
    ),
  );

  assert.ok(
    overview.includes(
      '"Skjul læste"',
    ),
  );
  assert.ok(
    overview.includes(
      '"Vis alle"',
    ),
  );
  assert.ok(
    overview.includes(
      '"directTrades" && (',
    ),
  );
  assert.ok(
    overview.includes(
      "onToggleHideReadDirectTrades",
    ),
  );

  assert.ok(
    page.includes(
      "hideReadDirectTrades={",
    ),
  );
  assert.ok(
    page.includes(
      "toggleHideReadDirectTrades",
    ),
  );
});
