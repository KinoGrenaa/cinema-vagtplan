import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");

for (const relative of [
  "backend/scripts/report-backend-audit.mjs",
  "frontend/scripts/report-frontend-audit.mjs",
]) {
  test(`${relative} koerer production- og komplet audit parallelt`, () => {
    const source = readFileSync(resolve(root, relative), "utf8");

    assert.match(
      source,
      /import \{ spawn \} from "node:child_process";/,
    );
    assert.doesNotMatch(source, /spawnSync/);
    assert.match(source, /export async function main\(\)/);
    assert.match(
      source,
      /await Promise\.all\(\[\s*runAudit\(\["--omit=dev"\]\),\s*runAudit\(\[\]\),\s*\]\)/,
    );
    assert.match(source, /production\.total !== 0/);
    assert.match(source, /await main\(\)/);
  });
}
