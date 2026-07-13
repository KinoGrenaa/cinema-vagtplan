import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { getCopenhagenTomorrowStart } from './helpers/leave-request-service-helpers';
import { notifyLeaveRequestsUpdated } from './helpers/leave-request-processing-helpers';

type ExpirePendingLeaveRequestsOptions = {
  referenceDate?: Date;
  cinemaId?: number;
};

@Injectable()
export class LeaveRequestExpiryService {
  private readonly logger = new Logger(LeaveRequestExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expirePendingLeaveRequests(
    options: ExpirePendingLeaveRequestsOptions = {},
  ) {
    const expiresBefore = getCopenhagenTomorrowStart(
      options.referenceDate,
    );

    const expiringRequests = await this.prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        startDate: {
          lt: expiresBefore,
        },
        ...(options.cinemaId
          ? {
              cinemaId: options.cinemaId,
            }
          : {}),
      },
      select: {
        id: true,
        cinemaId: true,
      },
    });

    if (expiringRequests.length === 0) {
      return 0;
    }

    const result = await this.prisma.leaveRequest.updateMany({
      where: {
        id: {
          in: expiringRequests.map((request) => request.id),
        },
        status: 'PENDING',
        startDate: {
          lt: expiresBefore,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count === 0) {
      return 0;
    }

    const cinemaIds = new Set(
      expiringRequests.map((request) => request.cinemaId),
    );

    cinemaIds.forEach((cinemaId) => {
      notifyLeaveRequestsUpdated(this.realtimeGateway, cinemaId);
    });

    this.logger.log(
      `${result.count} afventende fraværsansøgning(er) blev markeret som udløbet.`,
    );

    return result.count;
  }
}
