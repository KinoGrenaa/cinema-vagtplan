export function resolveNpmInvocation({
  env = process.env,
  platform = process.platform,
  execPath = process.execPath,
} = {}) {
  const npmExecPath = env.npm_execpath?.trim();

  if (npmExecPath) {
    return {
      command: execPath,
      argsPrefix: [npmExecPath],
      shell: false,
    };
  }

  return {
    command: platform === "win32" ? "npm.cmd" : "npm",
    argsPrefix: [],
    shell: platform === "win32",
  };
}
