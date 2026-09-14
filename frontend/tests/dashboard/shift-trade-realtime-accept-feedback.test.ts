import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const realtimeShifts = readFileSync(
  "app/hooks/useRealtimeShifts.ts",
  "utf8",
);

const realtimeCore = readFileSync(
  "app/hooks/useRealtimeCore.ts",
  "utf8",
);

test("shiftAccepted-feedback skelner afsender fra øvrige relevante modtagere", () => {
  assert.match(
    realtimeShifts,
    /isSameUser\(\s*trade\.offeredByUserId,\s*user\.id/,
  );
  assert.match(
    realtimeShifts,
    /har accepteret vagten:/,
  );
  assert.match(
    realtimeShifts,
    /Vagten er blevet taget af en anden kollega:/,
  );
  assert.doesNotMatch(
    realtimeShifts,
    /En vagt er blevet accepteret:/,
  );
});

test("realtime vagttekst følger kompakt vagtbytteformat", () => {
  assert.match(
    realtimeShifts,
    /year: "numeric"/,
  );
  assert.match(
    realtimeShifts,
    /kl\. \$\{timeText\}/,
  );
  assert.match(
    realtimeShifts,
    /\.join\(" · "\)/,
  );
});

test("shiftAccepted payload bærer accepterende bruger", () => {
  assert.match(
    realtimeCore,
    /acceptedByUser\?: \{/,
  );
  assert.match(
    realtimeShifts,
    /acceptedByUser\?: RealtimeShiftTradeUser/,
  );
});
