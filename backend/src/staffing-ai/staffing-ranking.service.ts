import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getActiveCinemaUserWhere } from './staffing-ai-cinema-access';
import { StaffingScore } from './types/staffing-score.type';

@Injectable()
export class StaffingRankingService {
  constructor(private prisma: PrismaService) {}

  async rankEmployeesForEmergency(cinemaId: number): Promise<StaffingScore[]> {
    const users = await this.prisma.user.findMany({
      where: getActiveCinemaUserWhere({
        cinemaId,
        role: Role.EMPLOYEE,
      }),
      include: {
        staffingAiProfile: true,
        shifts: true,
        timeEntries: true,
      },
    });

    const rankedUsers = users.map((user) => {
      const fatigueScore = user.staffingAiProfile?.fatigueScore ?? 0;
      const overtimeScore = user.staffingAiProfile?.overtimeScore ?? 0;
      const acceptanceScore = user.staffingAiProfile?.acceptanceRate ?? 0;
      const emergencyScore =
        user.staffingAiProfile?.emergencyAcceptanceRate ?? 0;
      const availabilityScore = 100;
      const totalScore =
        availabilityScore +
        acceptanceScore * 40 +
        emergencyScore * 25 -
        fatigueScore * 20 -
        overtimeScore * 20;

      return {
        userId: user.id,
        totalScore,
        fatigueScore,
        overtimeScore,
        availabilityScore,
        acceptanceScore,
        emergencyScore,
        reasoning: [
          `Acceptance rate: ${acceptanceScore}`,
          `Emergency rate: ${emergencyScore}`,
          `Fatigue: ${fatigueScore}`,
          `Overtime: ${overtimeScore}`,
        ],
      };
    });

    return rankedUsers.sort((a, b) => b.totalScore - a.totalScore);
  }
}
