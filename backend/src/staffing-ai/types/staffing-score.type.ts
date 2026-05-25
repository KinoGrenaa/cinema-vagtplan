export type StaffingScore = {
  userId: number;

  totalScore: number;

  fatigueScore: number;
  overtimeScore: number;
  availabilityScore: number;
  acceptanceScore: number;
  emergencyScore: number;

  reasoning: string[];
};
