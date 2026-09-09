import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const compact = (value) => value.replace(/\s+/g, " ").trim();

const schema = read("backend/prisma/schema.prisma");
const updateFlow = read("backend/src/shifts/helpers/shift-update-flow.ts");
const linkedActions = read("backend/src/shifts/helpers/shift-linked-actions.ts");
const cancelFlow = read("backend/src/shift-trades/helpers/shift-trade-cancel-flow.ts");
const history = read("frontend/app/(app)/shift-trades/components/list/ShiftTradesHistorySection.tsx");
const helper = read("frontend/app/(app)/shift-trades/helpers/core/shiftTradeHelpers.ts");

test("vagtflytning til anden dato lukker åbne handlinger uden at lukke samme-dags tidsændringer", () => {
  assert.ok(updateFlow.includes("movedToAnotherDate"));
  assert.ok(updateFlow.includes("getCopenhagenDateKey(oldShift.startTime)"));
  assert.ok(updateFlow.includes("ShiftTradeResolutionReason.SHIFT_MOVED"));
  assert.ok(!updateFlow.includes("oldShift.startTime.getTime() !== normalized.startTime.getTime()"));
});

test("vagtbytte-resolution gemmer aktør tidspunkt og årsag", () => {
  const compactSchema = compact(schema);
  const compactLinkedActions = compact(linkedActions);
  assert.ok(compactSchema.includes("resolvedAt DateTime?"));
  assert.ok(compactSchema.includes("resolvedByUserId Int?"));
  assert.ok(compactSchema.includes("resolutionReason ShiftTradeResolutionReason?"));
  assert.ok(compactLinkedActions.includes("resolvedByUserId: params.resolvedByUserId"));
  assert.ok(compactLinkedActions.includes("resolutionReason: params.resolutionReason"));
  assert.ok(cancelFlow.includes("WITHDRAWN_BY_OFFERER"));
});

test("direkte modtager får forklaring når tilbud bortfalder", () => {
  assert.ok(linkedActions.includes("SHIFT_TRADE_CANCELLED"));
  assert.ok(linkedActions.includes("ikke længere aktuelt"));
  assert.ok(cancelFlow.includes("Direkte vagttilbud trukket tilbage"));
});

test("historik bruger frosne vilkår og grupperer samme vagtdato", () => {
  const compactHistory = compact(history);
  assert.ok(helper.includes('trade.status === "OPEN"'));
  assert.ok(compactHistory.includes("new Map<string, ShiftTrade[]>()"));
  assert.ok(history.includes("hændelser"));
  assert.ok(history.includes("getEventLabel"));
  assert.ok(history.includes("getReasonLabel"));
  assert.ok(history.includes("Fra notifikation"));
});
