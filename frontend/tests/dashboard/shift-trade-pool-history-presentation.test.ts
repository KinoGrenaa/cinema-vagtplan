import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const historySource =
  readFileSync(
    "app/(app)/shift-trades/components/list/ShiftTradesHistorySection.tsx",
    "utf8",
  );

const typesSource =
  readFileSync(
    "app/(app)/shift-trades/helpers/core/shiftTradeTypes.ts",
    "utf8",
  );

test(
  "afsluttet vagtpulje viser personlige afslag i historikken",
  () => {
    assert.match(
      historySource,
      /trade\.declines\.map\(\(decline\) =>/,
    );
    assert.match(
      historySource,
      /takkede nej/,
    );
    assert.match(
      historySource,
      /decline\.declinedAt/,
    );
  },
);

test(
  "historikgruppens tæller beskriver vagtbytter og ikke underhændelser",
  () => {
    assert.match(
      historySource,
      /"vagtbytte" : "vagtbytter"/,
    );
    assert.doesNotMatch(
      historySource,
      /"hændelse" : "hændelser"/,
    );
  },
);

test(
  "vagtbyttets frontendtype bærer afslag med bruger og tidspunkt",
  () => {
    assert.match(
      typesSource,
      /declines\?: Array<\{/,
    );
    assert.match(
      typesSource,
      /declinedAt: string;/,
    );
    assert.match(
      typesSource,
      /user: User;/,
    );
  },
);
