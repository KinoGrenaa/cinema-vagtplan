import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

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

test("home opdeler systemnotifikationer og byttebeskeder", () => {
  const home = read(
    "app/(app)/home/page.tsx",
  );
  const service = read(
    "app/services/notificationsService.ts",
  );

  assert.ok(
    home.includes(
      "fetchUnreadNotificationSummary",
    ),
  );
  assert.ok(
    !home.includes(
      "fetchUnreadNotificationCount",
    ),
  );
  assert.ok(
    home.includes(
      "unreadNotificationSummary.systemCount > 0",
    ),
  );
  assert.ok(
    home.includes(
      "unreadNotificationSummary.directTradeResultCount > 0",
    ),
  );
  assert.ok(
    home.includes(
      '"1 ulæst systemnotifikation"',
    ),
  );
  assert.ok(
    home.includes(
      "ulæste systemnotifikationer",
    ),
  );
  assert.ok(
    home.includes(
      '"1 ulæst byttebesked"',
    ),
  );
  assert.ok(
    home.includes(
      "ulæste byttebeskeder",
    ),
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
  assert.ok(
    !home.includes(
      'type: "UNREAD_NOTIFICATIONS"',
    ),
  );

  assert.ok(
    service.includes(
      "export type NotificationUnreadSummary",
    ),
  );
  assert.ok(
    service.includes(
      "systemCount: number;",
    ),
  );
  assert.ok(
    service.includes(
      "directTradeResultCount: number;",
    ),
  );
  assert.match(
    service,
    /export\s+async\s+function\s+fetchUnreadNotificationSummary\s*\(/,
  );
});

test("home bevarer almindelige beskeder og direkte vagttilbud fra cinema-startoversigten", () => {
  const home = read(
    "app/(app)/home/page.tsx",
  );
  const overviewTypes = read(
    "app/components/cinema/cinemaStartOverview.ts",
  );

  assert.ok(
    home.includes(
      "...attentionItems",
    ),
  );
  assert.ok(
    overviewTypes.includes(
      '"UNREAD_MESSAGES"',
    ),
  );
  assert.ok(
    overviewTypes.includes(
      '"DIRECT_SHIFT_TRADES"',
    ),
  );

  assert.ok(
    !home.includes(
      "poolTradeCount",
    ),
  );
});

test("home viser fortsat tom tilstand når intet kræver opmærksomhed", () => {
  const home = read(
    "app/(app)/home/page.tsx",
  );

  assert.ok(
    home.includes(
      "visibleAttentionItems.length > 0",
    ),
  );
  assert.ok(
    home.includes(
      "Ingen aktuelle opgaver",
    ),
  );
});
