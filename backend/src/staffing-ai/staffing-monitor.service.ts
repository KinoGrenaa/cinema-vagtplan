import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { StaffingRequestsService } from '../staffing-requests/staffing-requests.service';
import { findAiRequestActorForCinema } from './staffing-ai-cinema-access';
import { findMovieStaffingIssues } from './movie-staffing-coverage';
import { PredictiveStaffingService } from './predictive-staffing.service';

@Injectable()
export class StaffingMonitorService {
  private readonly logger = new Logger(StaffingMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private staffingRequestsService: StaffingRequestsService,
    private predictiveStaffingService: PredictiveStaffingService,
  ) {}

  @Cron('*/5 * * * *')
  async checkForStaffingProblems() {
    const aiMonitorEnabled = process.env.ENABLE_AI_MONITOR === 'true';
    if (!aiMonitorEnabled) {
      return;
    }

    const now = new Date();
    const next12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const cinemas = await this.prisma.cinema.findMany({
      where: {
        aiEnabled: true,
      },
      include: {
        shifts: {
          where: {
            startTime: {
              lt: next12Hours,
            },
            endTime: {
              gt: now,
            },
          },
          include: {
            user: true,
            workType: true,
          },
        },
        movieShowings: {
          where: {
            startTime: {
              lt: next12Hours,
            },
            endTime: {
              gt: now,
            },
          },
        },
      },
    });

    for (const cinema of cinemas) {
      const existingRecentEmergencyRequest =
        await this.prisma.staffingRequest.findFirst({
          where: {
            cinemaId: cinema.id,
            type: 'EMERGENCY',
            status: 'PENDING',
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000),
            },
          },
        });

      const requestActor = await findAiRequestActorForCinema(
        this.prisma,
        cinema.id,
      );

      if (!requestActor) {
        continue;
      }

      if (!existingRecentEmergencyRequest) {
        const prediction =
          await this.predictiveStaffingService.predictStaffingPressure({
            cinemaId: cinema.id,
            startTime: now,
            endTime: next12Hours,
          });

        if (prediction.level === 'HIGH' || prediction.level === 'CRITICAL') {
          this.logger.warn(
            `Predictive staffing pressure detected in cinema ${cinema.id}: ${prediction.level}`,
          );

          await this.staffingRequestsService.createAiEmergencyRequests({
            cinemaId: cinema.id,
            requestedByUserId: requestActor.id,
            startTime: now,
            endTime: next12Hours,
            message:
              ` Predictive AI staffing alert.\n\n` +
              `Pressure level: ${prediction.level}\n\n` +
              prediction.reasoning.join('\n'),
            limit: prediction.level === 'CRITICAL' ? 8 : 5,
          });
          continue;
        }
      }

      const staffingIssues = findMovieStaffingIssues({
        cinemaId: cinema.id,
        startTime: now,
        endTime: next12Hours,
        shifts: cinema.shifts,
        movieShowings: cinema.movieShowings,
      }).map((issue) => ({
        startTime: issue.startTime,
        endTime: issue.endTime,
        reason:
          `AI detected understaffing. ` +
          `${issue.assignedStaff}/${issue.requiredStaff} staff assigned ` +
          `for ${issue.movieShowings} movie showing${
            issue.movieShowings === 1 ? '' : 's'
          }.`,
      }));

      for (const issue of staffingIssues) {
        const existingRequests = await this.prisma.staffingRequest.findFirst({
          where: {
            cinemaId: cinema.id,
            type: 'EMERGENCY',
            createdAt: {
              gte: new Date(now.getTime() - 60 * 60 * 1000),
            },
            status: 'PENDING',
          },
        });

        if (existingRequests) {
          continue;
        }

        this.logger.warn(`AI staffing issue detected in cinema ${cinema.id}`);
        await this.staffingRequestsService.createAiEmergencyRequests({
          cinemaId: cinema.id,
          requestedByUserId: requestActor.id,
          startTime: issue.startTime,
          endTime: issue.endTime,
          message: ` AI detected understaffing.\n\n${issue.reason}`,
          limit: 5,
        });
      }
    }
  }
}
