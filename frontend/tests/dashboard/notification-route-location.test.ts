import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const frontendRoot = process.cwd();

test("notifikationer findes kun under besked-workspacet", () => {
  const oldRoute = path.join(
    frontendRoot,
    "app/(app)/notifications",
  );
  const newRoute = path.join(
    frontendRoot,
    "app/(app)/messages/notifications",
  );

  assert.equal(
    fs.existsSync(oldRoute),
    false,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        newRoute,
        "NotificationsPage.tsx",
      ),
    ),
    true,
  );

  const wrapper = fs.readFileSync(
    path.join(
      newRoute,
      "page.tsx",
    ),
    "utf8",
  );

  assert.ok(
    wrapper.includes(
      'import NotificationsPage from "./NotificationsPage";',
    ),
  );
  assert.ok(
    !wrapper.includes(
      "../../notifications/page",
    ),
  );

  const shiftTradesHeader = fs.readFileSync(
    path.join(
      frontendRoot,
      "app/(app)/shift-trades/components/layout/ShiftTradesHeader.tsx",
    ),
    "utf8",
  );

  assert.ok(
    shiftTradesHeader.includes(
      '? "/messages/notifications"',
    ),
  );
  assert.ok(
    !shiftTradesHeader.includes(
      '? "/notifications"',
    ),
  );
});
