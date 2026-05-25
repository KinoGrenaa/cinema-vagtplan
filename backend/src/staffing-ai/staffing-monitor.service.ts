import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StaffingRequestsService } from '../staffing-requests/staffing-requests.service';
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
    const now = new Date();

    const next12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    const cinemas = await this.prisma.cinema.findMany({
      include: {
        shifts: {
          where: {
            startTime: {
              gte: now,
              lte: next12Hours,
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
              gte: now,
              lte: next12Hours,
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

      const admin = await this.prisma.user.findFirst({
        where: {
          cinemaId: cinema.id,
          role: {
            in: ['MASTER', 'ADMIN'],
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (!admin) {
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
            requestedByUserId: admin.id,
            startTime: now,
            endTime: next12Hours,
            message:
              `🤖 Predictive AI staffing alert.\n\n` +
              `Pressure level: ${prediction.level}\n\n` +
              prediction.reasoning.join('\n'),
            limit: prediction.level === 'CRITICAL' ? 8 : 5,
          });

          continue;
        }
      }

      const staffingIssues: {
        startTime: Date;
        endTime: Date;
        reason: string;
      }[] = [];

      const groupedHours = new Map<
        string,
        {
          shifts: number;
          movieShowings: number;
        }
      >();

      for (const shift of cinema.shifts) {
        const hourKey = new Date(shift.startTime).toISOString();

        if (!groupedHours.has(hourKey)) {
          groupedHours.set(hourKey, {
            shifts: 0,
            movieShowings: 0,
          });
        }

        groupedHours.get(hourKey)!.shifts += 1;
      }

      for (const movie of cinema.movieShowings) {
        const hourKey = new Date(movie.startTime).toISOString();

        if (!groupedHours.has(hourKey)) {
          groupedHours.set(hourKey, {
            shifts: 0,
            movieShowings: 0,
          });
        }

        groupedHours.get(hourKey)!.movieShowings += 1;
      }

      for (const [hour, data] of groupedHours.entries()) {
        const requiredStaff = Math.max(2, data.movieShowings * 2);

        if (data.shifts < requiredStaff) {
          const startTime = new Date(hour);

          const endTime = new Date(startTime);
          endTime.setHours(endTime.getHours() + 2);

          staffingIssues.push({
            startTime,
            endTime,

            reason:
              `AI detected understaffing. ` +
              `${data.shifts}/${requiredStaff} staff assigned.`,
          });
        }
      }

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
          requestedByUserId: admin.id,
          startTime: issue.startTime,
          endTime: issue.endTime,
          message: `🚨 AI detected understaffing.\n\n${issue.reason}`,
          limit: 5,
        });
      }
    }
  }
}
