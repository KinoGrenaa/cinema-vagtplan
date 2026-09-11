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

test("læste direkte byttebeskeder bevares som historik", () => {
  const groups = read(
    "app/(app)/messages/notifications/hooks/groups/useNotificationGroups.ts",
  );
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );

  const directStart =
    groups.indexOf(
      "const directResultNotifications = useMemo(",
    );
  const directEnd =
    groups.indexOf(
      "const visibleDirectResultNotifications =",
      directStart,
    );
  const directBlock =
    groups.slice(
      directStart,
      directEnd,
    );

  assert.ok(
    directStart >= 0 &&
      directEnd > directStart,
  );
  assert.ok(
    !directBlock.includes(
      "!notification.isRead",
    ),
  );
  assert.ok(
    directBlock.includes(
      'notification.type === "SHIFT_ACCEPTED"',
    ),
  );
  assert.ok(
    directBlock.includes(
      'notification.type === "SHIFT_REJECTED"',
    ),
  );
  assert.ok(
    directBlock.includes(
      'notification.type === "SHIFT_TRADE_CANCELLED"',
    ),
  );

  assert.ok(
    overview.includes(
      "!item.notification.isRead",
    ),
  );
  assert.ok(
    overview.includes(
      '? "bg-white dark:bg-gray-900"',
    ),
  );
  assert.ok(
    overview.includes(
      ': "bg-blue-50 dark:bg-blue-950/30"',
    ),
  );
});
