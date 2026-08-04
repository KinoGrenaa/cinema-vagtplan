import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleOptimizationService } from './schedule-optimization.service';
import { StaffingAiService } from './staffing-ai.service';

@Injectable()
export class ShiftGenerationService {
  constructor(
    private prisma: PrismaService,
    private scheduleOptimizationService: ScheduleOptimizationService,
    private staffingAiService: StaffingAiService,
  ) {}

  async generateSuggestedShifts(params: {
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    const optimization =
      await this.scheduleOptimizationService.optimizeSchedule({
        cinemaId: params.cinemaId,
        startDate: params.startDate,
        endDate: params.endDate,
      });

    const defaultJobFunction = await this.prisma.jobFunction.findFirst({
      where: {
        cinemaId: params.cinemaId,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    if (!defaultJobFunction) {
      return {
        suggestedShifts: [],
        recommendations: [
          'No job function found. Create a job function before generating shifts.',
        ],
        reasoning: optimization.reasoning,
      };
    }

    const suggestedShifts: any[] = [];

    for (const period of optimization.uncoveredPeriods) {
      const candidates = await this.staffingAiService.getTopEmergencyCandidates(
        params.cinemaId,
        period.startTime,
        period.endTime,
        3,
      );

      for (const candidate of candidates) {
        const qualification = await this.prisma.userJobFunction.findUnique({
          where: {
            userId_jobFunctionId: {
              userId: candidate.userId,
              jobFunctionId: defaultJobFunction.id,
            },
          },
          select: { id: true },
        });
        if (!qualification) continue;
        suggestedShifts.push({
          cinemaId: params.cinemaId,
          userId: candidate.userId,
          jobFunctionId: defaultJobFunction.id,
          jobFunctionName: defaultJobFunction.name,
          jobFunctionColor: defaultJobFunction.color,
          startTime: period.startTime,
          endTime: period.endTime,
          note:
            `AI suggested shift. ` +
            `Reason: ${period.reason}. ` +
            `Score: ${Math.round(candidate.totalScore)}.`,
          aiScore: candidate.totalScore,
          reasoning: candidate.reasoning,
        });
      }
    }

    const uniqueSuggestedShifts = suggestedShifts.filter(
      (shift, index, array) =>
        index ===
        array.findIndex(
          (item) =>
            item.userId === shift.userId &&
            item.startTime.getTime() === shift.startTime.getTime() &&
            item.endTime.getTime() === shift.endTime.getTime(),
        ),
    );

    return {
      suggestedShifts: uniqueSuggestedShifts,
      prediction: optimization.prediction,
      uncoveredPeriods: optimization.uncoveredPeriods,
      fatigueWarnings: optimization.fatigueWarnings,
      overtimeWarnings: optimization.overtimeWarnings,
      recommendations: optimization.recommendations,
      reasoning: [
        ...optimization.reasoning,
        `Generated ${uniqueSuggestedShifts.length} suggested shifts`,
      ],
    };
  }

  async createSuggestedShifts(params: {
    cinemaId: number;
    startDate: Date;
    endDate: Date;
    createdByNote?: string;
  }) {
    const result = await this.generateSuggestedShifts({
      cinemaId: params.cinemaId,
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const createdShifts: any[] = [];

    for (const suggestion of result.suggestedShifts) {
      const existingShift = await this.prisma.shift.findFirst({
        where: {
          cinemaId: suggestion.cinemaId,
          userId: suggestion.userId,
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
        },
      });

      if (existingShift) {
        continue;
      }

      const shift = await this.prisma.shift.create({
        data: {
          cinemaId: suggestion.cinemaId,
          userId: suggestion.userId,
          workTypeId: null,
          jobFunctionId: suggestion.jobFunctionId,
          jobFunctionNameSnapshot: suggestion.jobFunctionName,
          jobFunctionColorSnapshot: suggestion.jobFunctionColor,
          timingSource: 'MANUAL',
          startTime: suggestion.startTime,
          endTime: suggestion.endTime,
          note: params.createdByNote || suggestion.note || 'AI generated shift',
        },
      });

      createdShifts.push(shift);
    }

    return {
      ...result,
      createdShifts,
    };
  }
}
