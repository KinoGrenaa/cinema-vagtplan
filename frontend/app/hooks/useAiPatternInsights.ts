export type AiPatternInsightsData = {
  busiestDay: string;
  busiestDayCount: number;
  busiestHour: string;
  busiestHourCount: number;
  highFatigueEmployees: number;
};

export function useAiPatternInsights(
  shifts: any[],
  staffingHeatmap: any[],
): AiPatternInsightsData {
  const weekdayMap: Record<string, number> = {};

  const peakHourMap: Record<string, number> = {};

  shifts.forEach((shift) => {
    const start = new Date(shift.startTime);

    const weekday = start.toLocaleDateString("da-DK", {
      weekday: "long",
    });

    const hour = start.getHours();

    weekdayMap[weekday] = (weekdayMap[weekday] || 0) + 1;

    peakHourMap[hour] = (peakHourMap[hour] || 0) + 1;
  });

  const busiestDay = Object.entries(weekdayMap).sort((a, b) => b[1] - a[1])[0];

  const busiestHour = Object.entries(peakHourMap).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const highFatigueEmployees = staffingHeatmap.filter(
    (item) => item.risk === "HIGH",
  ).length;

  return {
    busiestDay: busiestDay?.[0] || "Ingen data",

    busiestDayCount: busiestDay?.[1] || 0,

    busiestHour: busiestHour?.[0] || "Ingen data",

    busiestHourCount: busiestHour?.[1] || 0,

    highFatigueEmployees,
  };
}
