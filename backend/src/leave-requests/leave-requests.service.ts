import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AuthUser,
  LeaveStatus,
  requireUserId,
  resolveLeaveCinemaId,
} from './helpers/leave-request-service-helpers';
import { createLeaveRequestFlow } from './helpers/leave-request-create-flow';
import { updateLeaveRequestStatusFlow } from './helpers/leave-request-status-flow';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private absenceImpactEngineService: AbsenceImpactEngineService,
    private realtimeGateway: RealtimeGateway,
    private notificationsService: NotificationsService,
  ) {}

  findAll(
    user: AuthUser,
    selectedCinemaId?: number | null,
    includeAll = false,
  ) {
    const userId = requireUserId(user);
    const cinemaId = resolveLeaveCinemaId(user, selectedCinemaId);
    const canViewAll =
      includeAll && (user.role === 'ADMIN' || user.role === 'MASTER');

    return this.prisma.leaveRequest.findMany({
      where: {
        cinemaId,
        ...(canViewAll ? {} : { userId }),
      },
      include: {
        user: true,
      },
      orderBy: {
        startDate: 'asc',
      },
    });
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
      prisma: this.prisma,
      absenceImpactEngineService: this.absenceImpactEngineService,
      realtimeGateway: this.realtimeGateway,
      notificationsService: this.notificationsService,
      user,
      data,
    });
  }

  async updateStatus(
    user: AuthUser,
    id: number,
    status: LeaveStatus,
    selectedCinemaId?: number | null,
  ) {
    return updateLeaveRequestStatusFlow({
      prisma: this.prisma,
      absenceImpactEngineService: this.absenceImpactEngineService,
      realtimeGateway: this.realtimeGateway,
      notificationsService: this.notificationsService,
      user,
      id,
      status,
      selectedCinemaId,
    });
  }
}
