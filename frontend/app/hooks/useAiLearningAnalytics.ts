export type AiLearningAnalyticsData = {
  emergencyEvents: number;
  fatigueTrend: number;
  overtimeTrend: number;
  aiInterventions: number;
};

export function useAiLearningAnalytics(
  movies: any[],
  shifts: any[],
  staffingWarnings: any[],
  predictiveStaffing: any[],
): AiLearningAnalyticsData {
  const emergencyEvents = movies.filter(
    (movie) => movie.soldSeats >= 200,
  ).length;

  const fatigueTrend = shifts.filter((shift) => {
    const start = new Date(shift.startTime);

    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 8;
  }).length;

  const overtimeTrend = shifts.filter((shift) => {
    const start = new Date(shift.startTime);

    const end = new Date(shift.endTime);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours >= 10;
  }).length;

  const aiInterventions = staffingWarnings.length + predictiveStaffing.length;

  return {
    emergencyEvents,
    fatigueTrend,
    overtimeTrend,
    aiInterventions,
  };
}
