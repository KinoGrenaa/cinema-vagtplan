import {
  Injectable,
} from '@nestjs/common';

import {
  NotificationsService,
} from '../notifications/notifications.service';
import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  RealtimeGateway,
} from '../realtime/realtime.gateway';
import {
  AbsenceImpactEngineService,
} from '../staffing-ai/absence-impact-engine.service';
import {
  ensureLeaveActorCinemaAccess,
} from './helpers/leave-request-cinema-access';
import {
  createLeaveRequestFlow,
} from './helpers/leave-request-create-flow';
import {
  findLeaveRequestPage,
  type LeaveRequestPageOptions,
} from './helpers/leave-request-page';
import {
  AuthUser,
  LeaveStatus,
  requireUserId,
  resolveLeaveCinemaId,
} from './helpers/leave-request-service-helpers';
import {
  updateLeaveRequestStatusFlow,
} from './helpers/leave-request-status-flow';
import {
  LeaveRequestExpiryService,
} from './leave-request-expiry.service';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma:
      PrismaService,
    private absenceImpactEngineService:
      AbsenceImpactEngineService,
    private realtimeGateway:
      RealtimeGateway,
    private notificationsService:
      NotificationsService,
    private leaveRequestExpiryService:
      LeaveRequestExpiryService,
  ) {}

  async findAll(
    user: AuthUser,
    selectedCinemaId?:
      number | null,
    includeAll = false,
  ) {
    const userId =
      requireUserId(user);
    const cinemaId =
      resolveLeaveCinemaId(
        user,
        selectedCinemaId,
      );
    const canViewAll =
      includeAll &&
      (user.role === 'ADMIN' ||
        user.role === 'MASTER');

    await ensureLeaveActorCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );
    await this.leaveRequestExpiryService.expirePendingLeaveRequests(
      {
        cinemaId,
      },
    );

    return this.prisma.leaveRequest.findMany({
      where: {
        cinemaId,
        ...(canViewAll
          ? {}
          : {
              userId,
            }),
      },
      include: {
        user: true,
        createdByUser:
          true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  async findPage(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
    options:
      LeaveRequestPageOptions = {},
  ) {
    const cinemaId =
      resolveLeaveCinemaId(
        user,
        selectedCinemaId,
      );

    await ensureLeaveActorCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );
    await this.leaveRequestExpiryService.expirePendingLeaveRequests(
      {
        cinemaId,
      },
    );

    return findLeaveRequestPage(
      this.prisma,
      user,
      cinemaId,
      options,
    );
  }

  async create(
    user: AuthUser,
    data: {
      startDate: string;
      endDate: string;
      reason?: string;
      cinemaId?: number;
      userId?: number;
    },
  ) {
    return createLeaveRequestFlow({
      prisma:
        this.prisma,
      absenceImpactEngineService:
        this.absenceImpactEngineService,
      realtimeGateway:
        this.realtimeGateway,
      notificationsService:
        this.notificationsService,
      user,
      data,
    });
  }

  async updateStatus(
    user: AuthUser,
    id: number,
    status: LeaveStatus,
    selectedCinemaId?:
      number | null,
  ) {
    return updateLeaveRequestStatusFlow({
      prisma:
        this.prisma,
      absenceImpactEngineService:
        this.absenceImpactEngineService,
      realtimeGateway:
        this.realtimeGateway,
      notificationsService:
        this.notificationsService,
      user,
      id,
      status,
      selectedCinemaId,
    });
  }
}
