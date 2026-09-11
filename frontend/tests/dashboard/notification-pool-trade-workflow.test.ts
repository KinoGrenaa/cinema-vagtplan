import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const frontendRoot = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(
    path.join(frontendRoot, relativePath),
    "utf8",
  );
}

test("vagtpuljebeskeder har egen kategori og læst-handling", () => {
  const groups = read(
    "app/(app)/messages/notifications/hooks/groups/useNotificationGroups.ts",
  );
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );
  const page = read(
    "app/(app)/messages/notifications/NotificationsPage.tsx",
  );
  const service = read(
    "app/services/notificationsService.ts",
  );

  assert.ok(
    groups.includes('notification.type !== "SHIFT_TRADE"'),
  );
  assert.ok(
    groups.includes('notification.type === "SHIFT_TRADE"'),
  );
  assert.ok(
    groups.includes("poolTradeCount + poolResultUnreadCount"),
  );
  assert.ok(
    overview.includes("Markér vagtpuljebeskeder som læst"),
  );
  assert.ok(
    overview.includes("poolResultUnreadCount"),
  );
  assert.ok(
    page.includes('activeCategory !== "poolTrades"'),
  );
  assert.ok(
    service.includes('| "poolTrades"'),
  );
  assert.ok(
    service.includes("poolTradeResultCount"),
  );
});

test("vagtpuljen viser hele tidsrummet og bevarer resultatbeskeder", () => {
  const overview = read(
    "app/(app)/messages/notifications/components/overview/NotificationsOverview.tsx",
  );
  const helpers = read(
    "app/(app)/messages/notifications/helpers/core/notificationHelpers.ts",
  );

  assert.ok(
    overview.includes("PoolTradeNotificationItem"),
  );
  assert.ok(
    overview.includes("item.kind === \"result\""),
  );
  assert.ok(
    overview.includes("formatShiftPeriodDK("),
  );
  assert.ok(
    helpers.includes("formatShiftPeriodDK"),
  );
  assert.ok(
    helpers.includes("formatTimeDK(end)"),
  );
});

test("tomme bemandingsforespørgsler skjules på vagtbyttesiden", () => {
  const staffing = read(
    "app/(app)/shift-trades/components/staffing/ShiftTradesStaffingSection.tsx",
  );

  assert.ok(
    staffing.includes("pendingCount === 0"),
  );
  assert.ok(
    staffing.includes("!requestTarget.requestId"),
  );
});

test("acceptdialog holder navn og dato/tid samlet", () => {
  const actions = read(
    "app/(app)/shift-trades/hooks/actions/useShiftTradeActions.ts",
  );

  assert.ok(
    actions.includes("replaceAll(\" \", \"\\u00A0\")"),
  );
  assert.ok(
    actions.includes("const shiftPeriod ="),
  );
});

test("vagtpulje bruges konsekvent i de tilgængelige sendehandlinger", () => {
  const shiftForm = read(
    "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  );
  const myShiftActions = read(
    "app/(app)/my-shifts/hooks/actions/useMyShiftsTradeActions.ts",
  );

  assert.ok(
    shiftForm.includes("Send i vagtpulje"),
  );
  assert.ok(
    !shiftForm.includes("Send i byttepulje"),
  );
  assert.ok(
    myShiftActions.includes('confirmText: "Send i vagtpulje"'),
  );
  assert.ok(
    myShiftActions.includes('setMessage("Vagten er sendt til vagtpuljen.")'),
  );

  const myShiftsList = read(
    "app/(app)/my-shifts/components/list/MyShiftsListSection.tsx",
  );
  assert.ok(
    myShiftsList.includes("Send til vagtpulje"),
  );
  assert.ok(
    !myShiftsList.includes("Send til fælles pulje"),
  );
  assert.ok(
    !myShiftActions.includes("fælles pulje"),
  );
});


test("admin advares før ændringer annullerer aktive udsendelser", () => {
  const shiftForm = read(
    "app/(app)/schedule/components/shift-form/ShiftForm.tsx",
  );

  assert.ok(
    shiftForm.includes('import ConfirmModal from "@/app/components/modals/ConfirmModal"'),
  );
  assert.ok(
    shiftForm.includes("hasActivePoolTrade"),
  );
  assert.ok(
    shiftForm.includes("hasActiveDirectTrade"),
  );
  assert.ok(
    shiftForm.includes("hasActiveStaffingRequest"),
  );
  assert.ok(
    shiftForm.includes("linkedActionsWillBeCancelled"),
  );
  assert.ok(
    shiftForm.includes('"Flyt vagt til anden dato?"'),
  );
  assert.ok(
    shiftForm.includes('"Skift medarbejder på vagten?"'),
  );
  assert.ok(
    shiftForm.includes("Berørte medarbejdere får besked."),
  );
  assert.ok(
    shiftForm.includes("formRef.current?.requestSubmit()"),
  );
});

test("schedule giver tydelig succesfeedback og bruger vagtpulje-terminologi", () => {
  const shiftState = read(
    "app/(app)/schedule/hooks/state/useScheduleShiftForm.ts",
  );

  assert.ok(
    shiftState.includes('toast.success("Vagten er oprettet")'),
  );
  assert.ok(
    shiftState.includes('toast.success("Vagten er opdateret")'),
  );
  assert.ok(
    shiftState.includes('toast.success("Vagten er flyttet")'),
  );
  assert.ok(
    shiftState.includes('toast.success("Medarbejderen er skiftet")'),
  );
  assert.ok(
    shiftState.includes('title: "Send vagt i vagtpulje"'),
  );
  assert.ok(
    shiftState.includes('confirmText: "Send i vagtpulje"'),
  );
  assert.ok(
    shiftState.includes('"Vagten er sendt i vagtpuljen"'),
  );
  assert.ok(
    !shiftState.includes("byttepulje"),
  );
});

test("sletning advarer om aktive udsendelser", () => {
  const shiftState = read(
    "app/(app)/schedule/hooks/state/useScheduleShiftForm.ts",
  );

  assert.ok(
    shiftState.includes("linkedDeleteImpactLabels"),
  );
  assert.ok(
    shiftState.includes("Berørte medarbejdere får besked."),
  );
  assert.ok(
    shiftState.includes("Disse annulleres"),
  );
});
test("shift trade history sorts groups by shift date and events by event time", () => {
  const history = read(
    "app/(app)/shift-trades/components/list/ShiftTradesHistorySection.tsx",
  );

  assert.ok(
    history.includes("rightDate.localeCompare(leftDate)"),
  );
  assert.ok(
    history.includes("trade.resolvedAt ?? trade.createdAt"),
  );
  assert.ok(
    history.includes("getHistoryEventTimestamp(right)"),
  );
  assert.ok(
    history.includes("getHistoryEventTimestamp(left)"),
  );
  assert.ok(
    history.includes("right.id - left.id"),
  );
});
test("notifikationsheader bruger samlet opmærksomhedstæller", () => {
  const page = read(
    "app/(app)/messages/notifications/NotificationsPage.tsx",
  );
  const header = read(
    "app/(app)/messages/notifications/components/layout/NotificationsHeader.tsx",
  );

  assert.ok(
    page.includes("attentionCount={"),
  );
  assert.ok(
    page.includes("totalCount"),
  );
  assert.ok(
    !page.includes("<NotificationsHeader\\n          unreadCount={"),
  );
  assert.ok(
    header.includes("attentionCount: number"),
  );
  assert.ok(
    header.includes("Intet kræver din opmærksomhed."),
  );
  assert.ok(
    header.includes("kræver din opmærksomhed"),
  );
  assert.ok(
    !header.includes("ulæste notifikationer"),
  );
});
test("notifikationsheader bruger naturlig singular og plural", () => {
  const header = read(
    "app/(app)/messages/notifications/components/layout/NotificationsHeader.tsx",
  );

  assert.ok(
    header.includes("Én notifikation kræver din opmærksomhed."),
  );
  assert.ok(
    header.includes("`${attentionCount} notifikationer kræver din opmærksomhed.`"),
  );
  assert.ok(
    !header.includes("1 ting"),
  );
  assert.ok(
    !header.includes("ting, der kræver din opmærksomhed"),
  );
});