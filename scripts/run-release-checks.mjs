import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set([
  "--help",
  "--host",
  "--list",
  "--quick",
  "--restart",
  "--skip-build",
]);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));

if (unknownArgs.length > 0) {
  console.error(`Ukendte argumenter: ${unknownArgs.join(", ")}`);
  process.exit(2);
}

if (args.has("--help")) {
  console.log(`Releasekontrol\n\nBrug:\n  npm run verify:release\n  npm run verify:release:quick\n  npm run verify:release -- --restart\n  npm run verify:release -- --host\n  npm run verify:release -- --list\n\nArgumenter:\n  --quick       Spring den fulde backend-testsuite over.\n  --host        Kør npm-kommandoer direkte i backend/frontend.\n  --restart     Genstart Docker-services og vis de seneste logs.\n  --skip-build  Spring backend- og frontend-build over.\n  --list        Vis planen uden at udføre kommandoerne.\n`);
  process.exit(0);
}

const useHost = args.has("--host");
const quick = args.has("--quick");
const restart = args.has("--restart");
const skipBuild = args.has("--skip-build");
const listOnly = args.has("--list");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function step(label, command, commandArgs, options = {}) {
  return {
    label,
    command,
    args: commandArgs,
    cwd: options.cwd ?? repoRoot,
  };
}

function dockerStep(label, service, commandArgs) {
  return step(label, "docker", [
    "compose",
    "exec",
    "-T",
    service,
    ...commandArgs,
  ]);
}

function npmStep(label, directory, commandArgs) {
  return step(label, npmCommand, commandArgs, {
    cwd: resolve(repoRoot, directory),
  });
}

const steps = [
  step("Git whitespace-kontrol", "git", ["diff", "--check"]),
  step("Release-hygiejne", process.execPath, [
    resolve(repoRoot, "scripts", "check-release-hygiene.mjs"),
  ]),
];

if (!useHost) {
  steps.push(step("Docker Compose-konfiguration", "docker", ["compose", "config", "--quiet"]));
}

if (!quick) {
  steps.push(
    useHost
      ? npmStep("Fuld backend-testsuite", "backend", ["test", "--", "--runInBand"])
      : dockerStep("Fuld backend-testsuite", "backend", ["npm", "test", "--", "--runInBand"]),
  );
}

steps.push(
  useHost
    ? npmStep("Backend release-regression", "backend", ["run", "test:release"])
    : dockerStep("Backend release-regression", "backend", ["npm", "run", "test:release"]),
  useHost
    ? npmStep("Dashboard-regression", "frontend", ["run", "test:dashboard"])
    : dockerStep("Dashboard-regression", "frontend", ["npm", "run", "test:dashboard"]),
);

if (!skipBuild) {
  steps.push(
    useHost
      ? npmStep("Backend-build", "backend", ["run", "build"])
      : dockerStep("Backend-build", "backend", ["npm", "run", "build"]),
    useHost
      ? npmStep("Frontend-build", "frontend", ["run", "build"])
      : dockerStep("Frontend-build", "frontend", ["npm", "run", "build"]),
  );
}

if (restart) {
  if (useHost) {
    console.error("--restart kan kun bruges i Docker-tilstand.");
    process.exit(2);
  }

  steps.push(
    step("Genstart backend og frontend", "docker", [
      "compose",
      "restart",
      "backend",
      "frontend",
    ]),
    step("Runtime-logkontrol", "docker", [
      "compose",
      "logs",
      "--tail=120",
      "backend",
      "frontend",
    ]),
  );
}

function printableCommand(item) {
  const command = [item.command, ...item.args]
    .map((value) => (/\s/.test(value) ? JSON.stringify(value) : value))
    .join(" ");
  const relativeCwd = item.cwd === repoRoot
    ? "."
    : item.cwd.slice(repoRoot.length + 1).replaceAll("\\", "/");
  return `${relativeCwd}> ${command}`;
}

if (listOnly) {
  console.log(`Releaseplan (${quick ? "hurtig" : "fuld"}, ${useHost ? "host" : "Docker"}):\n`);
  steps.forEach((item, index) => {
    console.log(`${index + 1}. ${item.label}`);
    console.log(`   ${printableCommand(item)}`);
  });
  process.exit(0);
}

const startedAt = Date.now();
console.log(`Starter ${quick ? "hurtig" : "fuld"} releasekontrol i ${useHost ? "host" : "Docker"}-tilstand.`);

for (const [index, item] of steps.entries()) {
  console.log(`\n[${index + 1}/${steps.length}] ${item.label}`);
  console.log(printableCommand(item));

  const result = spawnSync(item.command, item.args, {
    cwd: item.cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`Kunne ikke starte trinnet: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`Releasekontrollen stoppede ved: ${item.label}`);
    process.exit(result.status ?? 1);
  }
}

const seconds = Math.round((Date.now() - startedAt) / 1000);
console.log(`\nReleasekontrol bestået: ${steps.length} trin gennemført på ${seconds} sekunder.`);
