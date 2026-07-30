import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const errors = [];
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".dashboard-test-build",
  "coverage",
  "dist",
  "node_modules",
  "uploads",
]);
const textExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const conflictMarkers = [
  "<<<<<<< ",
  "=======",
  ">>>>>>> ",
];

function displayPath(path) {
  return relative(repoRoot, path).replaceAll("\\", "/") || ".";
}

function walk(directory, visitor) {
  if (!existsSync(directory)) return;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, visitor);
    else visitor(path);
  }
}

function checkRootArtifacts() {
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".zip")) {
      errors.push(`ZIP-fil ligger stadig i repo root: ${entry.name}`);
    }

    if (
      entry.isDirectory() &&
      (/^__.*_temp$/i.test(entry.name) || entry.name === ".dashboard-test-build")
    ) {
      errors.push(`Midlertidig mappe ligger stadig i repo root: ${entry.name}`);
    }
  }

  const dashboardBuild = join(repoRoot, "frontend", ".dashboard-test-build");
  if (existsSync(dashboardBuild)) {
    errors.push("Dashboardtestenes midlertidige buildmappe er ikke ryddet.");
  }
}

function checkRemovedPushRoute() {
  const pushRoute = join(repoRoot, "frontend", "app", "(app)", "push");
  if (existsSync(pushRoute)) {
    errors.push("Den fjernede /push-route findes igen.");
  }

  const appRoot = join(repoRoot, "frontend", "app");
  const routePatterns = [
    /href\s*=\s*["']\/push(?:[?/#"'])/,
    /href\s*:\s*["']\/push(?:[?/#"'])/,
    /router\.(?:push|replace)\(\s*["']\/push(?:[?/#"'])/,
    /pathname\s*===?\s*["']\/push["']/,
  ];

  walk(appRoot, (path) => {
    if (![".js", ".jsx", ".ts", ".tsx"].includes(extname(path))) return;
    const content = readFileSync(path, "utf8");
    if (routePatterns.some((pattern) => pattern.test(content))) {
      errors.push(`Reference til den fjernede /push-route: ${displayPath(path)}`);
    }
  });
}

function checkConflictMarkers() {
  for (const root of [
    join(repoRoot, "backend"),
    join(repoRoot, "frontend"),
    join(repoRoot, "scripts"),
    join(repoRoot, ".github"),
  ]) {
    walk(root, (path) => {
      if (!textExtensions.has(extname(path))) return;
      if (statSync(path).size > 2_000_000) return;

      const lines = readFileSync(path, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (conflictMarkers.some((marker) => line.startsWith(marker))) {
          errors.push(
            `Konfliktmarkør i ${displayPath(path)}:${index + 1}`,
          );
        }
      });
    });
  }
}

checkRootArtifacts();
checkRemovedPushRoute();
checkConflictMarkers();

if (errors.length > 0) {
  console.error("Release-hygiejnen fandt problemer:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Release-hygiejne OK: ingen ZIP/temp-rester, /push-genveje eller konfliktmarkører.");
