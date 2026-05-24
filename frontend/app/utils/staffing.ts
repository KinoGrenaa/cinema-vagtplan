export function calculateShiftHours(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  return (end.getTime() - start.getTime()) / 1000 / 60 / 60;
}

export function calculateFatigueRisk(hours: number): "LOW" | "MEDIUM" | "HIGH" {
  if (hours >= 9) {
    return "HIGH";
  }

  if (hours >= 6) {
    return "MEDIUM";
  }

  return "LOW";
}

export function calculateMoviePressure(soldSeats: number) {
  return Math.ceil(soldSeats / 80);
}

export function getStaffingSeverity(
  shortage: number,
): "STABLE" | "WARNING" | "CRITICAL" {
  if (shortage > 3) {
    return "CRITICAL";
  }

  if (shortage > 1) {
    return "WARNING";
  }

  return "STABLE";
}
