import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/schedule/components/time-registration/TimeRegistrationModals.tsx",
    "utf8",
  );

test(
  "mødetidsforklaringen står mellem notefelt og Registrer mødetid",
  () => {
    assert.match(
      source,
      /placeholder="Forklar eventuel ændret mødetid"\s*\/>\s*\{clockInBlockedByMissingNote && \(\s*<p[^>]*>\s*Skriv en note, fordi mødetiden afviger fra den planlagte tid\.\s*<\/p>\s*\)\}\s*<button\s+onClick=\{onRegisterClockIn\}\s+disabled=\{clockInBlockedByMissingNote\}/s,
    );
  },
);

test(
  "fyraftensforklaringen står mellem notefelt og Registrer fyraften",
  () => {
    assert.match(
      source,
      /placeholder="Forklar eventuel ændret fyraften"\s*\/>\s*\{clockOutBlockedByMissingNote && \(\s*<p[^>]*>\s*Skriv en note, fordi fyraften afviger fra den planlagte tid\.\s*<\/p>\s*\)\}\s*<button\s+onClick=\{onRegisterClockOut\}\s+disabled=\{clockOutBlockedByMissingNote\}/s,
    );
  },
);
