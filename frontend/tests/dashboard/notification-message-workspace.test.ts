import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(file, "utf8");

test("notifikationer ligger i besked-workspacet og ikke under indstillinger", () => {
  const menu = read("app/components/AppMenu.tsx");
  const workspace = read(
    "app/(app)/messages/components/layout/MessagesWorkspaceNav.tsx",
  );
  const route = read(
    "app/(app)/messages/notifications/page.tsx",
  );

  assert.ok(
    menu.includes('href: "/messages/notifications"'),
  );
  assert.ok(
    !menu.includes('href: "/notifications"'),
  );
  assert.ok(
    workspace.includes('label: "Notifikationer"'),
  );
  assert.ok(
    route.includes('active="notifications"'),
  );
});

test("notifikationsoversigten duplikerer ikke beskedmodulet", () => {
  const page = read(
    "app/(app)/messages/notifications/NotificationsPage.tsx",
  );

  assert.ok(
    page.includes("messagesEnabled: false"),
  );
});

test("notifikationsgrupper og vagtbyttehistorik starter sammenfoldet", () => {
  const groups = read(
    "app/(app)/messages/notifications/hooks/groups/useNotificationGroups.ts",
  );
  const history = read(
    "app/(app)/shift-trades/components/list/ShiftTradesHistorySection.tsx",
  );

  assert.ok(
    !groups.includes("const latestDateKey ="),
  );
  assert.ok(
    history.includes("open={containsFocusedTrade}"),
  );
  assert.ok(
    !history.includes("groupIndex === 0"),
  );
});

test("redundant vagtbytte-sluttekst er fjernet og kategori-hover har dedikeret styling", () => {
  const openSection = read(
    "app/(app)/shift-trades/components/list/ShiftTradesOpenSection.tsx",
  );
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );
  const css = read(
    "app/(app)/messages/notifications/NotificationsPage.module.css",
  );

  assert.ok(
    !openSection.includes("Alle åbne vagtbytter er vist"),
  );
  assert.ok(
    overview.includes('data-notification-category-card="true"'),
  );
  assert.ok(
    css.includes('data-notification-category-card="true"'),
  );
});

test("læste notifikationer kan ikke ryddes fra brugerfladen", () => {
  const page = read("app/(app)/messages/notifications/NotificationsPage.tsx");
  const header = read("app/(app)/messages/notifications/components/layout/NotificationsHeader.tsx");
  const hook = read("app/hooks/useNotifications.ts");
  const service = read("app/services/notificationsService.ts");

  assert.ok(!page.includes("handleClearReadNotifications"));
  assert.ok(!header.includes("Ryd læste"));
  assert.ok(!hook.includes("clearRead"));
  assert.ok(!service.includes("clearReadNotifications"));
});


test("notifikationskategorier har kategori-specifik læst-handling", () => {
  const page = read(
    "app/(app)/messages/notifications/NotificationsPage.tsx",
  );
  const header = read(
    "app/(app)/messages/notifications/components/layout/NotificationsHeader.tsx",
  );
  const groups = read(
    "app/(app)/messages/notifications/hooks/groups/useNotificationGroups.ts",
  );
  const hook = read(
    "app/hooks/useNotifications.ts",
  );
  const service = read(
    "app/services/notificationsService.ts",
  );
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );

  assert.ok(
    page.includes("markCategoryAsRead"),
  );
  assert.ok(
    overview.includes("Markér systemnotifikationer som læst"),
  );
  assert.ok(
    overview.includes("Markér byttebeskeder som læst"),
  );
  assert.ok(
    !header.includes("onMarkAllNotificationsAsRead"),
  );
  assert.ok(
    groups.includes('notification.type !== "NEW_MESSAGE"'),
  );
  assert.ok(
    groups.includes("messagesEnabled"),
  );
  assert.ok(
    hook.includes("fetchUnreadNotificationSummary"),
  );
  assert.ok(
    hook.includes("directResultUnreadCount"),
  );
  assert.ok(
    service.includes("/notifications/read-category/"),
  );
  assert.ok(
    !service.includes("markAllNotificationsAsRead"),
  );
  assert.ok(
    overview.includes("systemUnreadCount"),
  );
  assert.ok(
    overview.includes("systemNotificationCount"),
  );
});


test("notifikationsheader viser ulæste og kategori-handlingen ligger ved kategorioversigten", () => {
  const header = read(
    "app/(app)/messages/notifications/components/layout/NotificationsHeader.tsx",
  );
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );
  const page = read(
    "app/(app)/messages/notifications/NotificationsPage.tsx",
  );

  assert.ok(
    header.includes("Du har {unreadCount} ulæste"),
  );
  assert.ok(
    !header.includes("aktive"),
  );
  assert.ok(
    !header.includes("Markér systemnotifikationer som læst"),
  );
  assert.ok(
    !header.includes("Markér byttebeskeder som læst"),
  );

  assert.ok(
    overview.includes("Markér systemnotifikationer som læst"),
  );
  assert.ok(
    overview.includes("Markér byttebeskeder som læst"),
  );
  assert.ok(
    overview.includes("directResultUnreadCount"),
  );
  assert.ok(
    overview.includes("onMarkCategoryAsRead"),
  );
  assert.ok(
    overview.includes("sm:justify-between"),
  );

  assert.ok(
    page.includes("unreadCount={"),
  );
  assert.ok(
    page.includes("directResultUnreadCount={"),
  );
  assert.ok(
    page.includes("onMarkCategoryAsRead={"),
  );
});
