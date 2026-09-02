import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page =
  readFileSync(
    "app/(app)/cinema-settings/page.tsx",
    "utf8",
  );

const header =
  readFileSync(
    "app/(app)/cinema-settings/components/layout/CinemaSettingsHeaderSection.tsx",
    "utf8",
  );

const payroll =
  readFileSync(
    "app/(app)/cinema-settings/components/payroll/CinemaSettingsPayrollSection.tsx",
    "utf8",
  );

const dataHook =
  readFileSync(
    "app/(app)/cinema-settings/hooks/data/useCinemaSettingsData.ts",
    "utf8",
  );

test(
  "biografindstillinger viser autosave som global toast i viewporten",
  () => {
    assert.match(
      dataHook,
      /toast\.loading\([\s\S]*"Gemmer ændringer…"[\s\S]*CINEMA_SETTINGS_SAVE_TOAST_ID/,
    );

    assert.match(
      dataHook,
      /toast\.success\([\s\S]*"Gemt"[\s\S]*CINEMA_SETTINGS_SAVE_TOAST_ID/,
    );

    assert.match(
      dataHook,
      /toast\.dismiss\([\s\S]*CINEMA_SETTINGS_SAVE_TOAST_ID/,
    );
  },
);

test(
  "headeren gentager ikke autosave-status",
  () => {
    assert.doesNotMatch(
      header,
      /saving: boolean;/,
    );
    assert.doesNotMatch(
      header,
      /saved: boolean;/,
    );
    assert.doesNotMatch(
      header,
      /Gemmer…|>Gemt</,
    );
    assert.match(
      page,
      /<CinemaSettingsHeaderSection cinemaName=\{cinema\.name\} \/>/,
    );
  },
);

test(
  "lønsektionen gentager ikke den globale gemmestatus",
  () => {
    assert.doesNotMatch(
      payroll,
      /message: string \| null;/,
    );
    assert.doesNotMatch(
      payroll,
      /savingIndicator/,
    );
    assert.doesNotMatch(
      payroll,
      /\{message\}/,
    );
  },
);
