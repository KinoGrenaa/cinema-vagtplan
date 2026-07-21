import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeAiLearningEvent,
  parseAiLearningCinemaId,
  type AiLearningEventInput,
} from './ai-learning-input';

@Injectable()
export class AiLearningService {
  constructor(private prisma: PrismaService) {}

  private async ensureCinemaExists(
    cinemaId: number,
  ) {
    const cinema =
      await this.prisma.cinema.findUnique({
        where: {
          id: cinemaId,
        },
        select: {
          id: true,
        },
      });

    if (!cinema) {
      throw new BadRequestException(
        'Biografen findes ikke.',
      );
    }
  }

  async createEvent(
    data: AiLearningEventInput,
  ) {
    const normalizedData =
      normalizeAiLearningEvent(data);

    await this.ensureCinemaExists(
      normalizedData.cinemaId,
    );

    return this.prisma.aiLearningEvent.create({
      data: normalizedData,
    });
  }

  async getStatistics(
    cinemaIdValue: unknown,
  ) {
    const cinemaId =
      parseAiLearningCinemaId(
        cinemaIdValue,
      );

    await this.ensureCinemaExists(cinemaId);

    const [
      totalEvents,
      emergencyEvents,
      overtimeEvents,
      fatigueEvents,
    ] = await Promise.all([
      this.prisma.aiLearningEvent.count({
        where: {
          cinemaId,
        },
      }),
      this.prisma.aiLearningEvent.count({
        where: {
          cinemaId,
          type: 'EMERGENCY_STAFFING',
        },
      }),
      this.prisma.aiLearningEvent.count({
        where: {
          cinemaId,
          type: 'OVERTIME_WARNING',
        },
      }),
      this.prisma.aiLearningEvent.count({
        where: {
          cinemaId,
          type: 'FATIGUE_WARNING',
        },
      }),
    ]);

    return {
      totalEvents,
      emergencyEvents,
      overtimeEvents,
      fatigueEvents,
    };
  }
}
