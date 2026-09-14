import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "app/(app)/my-shifts/hooks/actions/useMyShiftsTradeActions.ts",
  "utf8",
);

test("send-besked følger det konkrete åbne vagtbytte", () => {
  assert.match(
    source,
    /type SentTradeMessageContext = \{/,
  );
  assert.match(
    source,
    /setSentTradeMessageContext\(\{\s*shiftId,\s*type: "POOL",/,
  );
  assert.match(
    source,
    /setSentTradeMessageContext\(\{\s*shiftId,\s*type: "DIRECT",\s*targetUserId,/,
  );
});

test("stale send-besked ryddes først efter at det fulgte åbne tilbud har eksisteret", () => {
  assert.match(
    source,
    /matchingOpenTradeWasPresentRef\.current &&\s*!matchingOpenTrade/,
  );
  assert.match(
    source,
    /setMessage\(""\);\s*setSentTradeMessageContext\(\s*null,\s*\);/,
  );
  assert.match(
    source,
    /matchingOpenTradeWasPresentRef\.current =\s*matchingOpenTrade;/,
  );
});

test("andre lokale handlingsbeskeder afkobles fra send-konteksten", () => {
  assert.match(
    source,
    /function setActionMessage\(/,
  );
  assert.match(
    source,
    /setActionMessage\("Vagten er accepteret\."\)/,
  );
  assert.match(
    source,
    /setActionMessage\("Du har takket nej til vagten\."\)/,
  );
});
