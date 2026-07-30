export function elapsedMilliseconds(
  startedAt: number,
  endedAt = performance.now(),
): number {
  return Math.max(0, endedAt - startedAt);
}

export function formatStartupDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "ukendt tid";
  }
  if (milliseconds < 1_000) {
    return `${Math.round(milliseconds)} ms`;
  }
  return `${(milliseconds / 1_000).toFixed(1).replace(".", ",")} s`;
}

export function processUptimeMilliseconds(): number {
  return process.uptime() * 1_000;
}
