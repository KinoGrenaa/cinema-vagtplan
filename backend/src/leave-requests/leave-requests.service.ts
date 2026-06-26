import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  formatLeavePeriod,
  formatUserName,
} from './helpers/leave-request-formatting';

import {
  AuthUser,
  LeaveRequestWithUser,
  LeaveStatus,
  ensureLeaveStatusChangeAllowed,
  createOverlappingShiftException,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestDates,
} from './helpers/leave-request-service-helpers';

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private absenceImpactEngineService: AbsenceImpactEngineService,
    private realtimeGateway: RealtimeGateway,
    private notificationsService: NotificationsService,
  ) {}

  private async findOverlappingShift(
    userId: number,
    cinemaId: number,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.shift.findFirst({
      where: {
        userId,
        cinemaId,
        startTime: { lt: endDate },
        endTime: { gt: startDate },
      },
      include: {
        workType: true,
      },
    });
  }

  private async ensureNoOverlappingShift(
    userId: number,
    cinemaId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const shift = await this.findOverlappingShift(
      userId,
      cinemaId,
      startDate,
      endDate,
    );

    if (shift) {
      throw createOverlappingShiftException(shift);
    }
  }

  private notifyLeaveRequestsUpdated(cinemaId: number) {
    this.realtimeGateway.notifyCinema(cinemaId, 'leaveRequestsUpdated', {
      cinemaId,
    });
  }

  private async getLeaveManagers(cinemaId: number, excludeUserId?: number) {
    return this.prisma.user.findMany({
      where: {
        cinemaId,
        isActive: true,
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        OR: [
          { role: 'ADMIN' },
          { role: 'MASTER' },
          { canManageLeaveRequests: true },
        ],
      },
      select: {
        id: true,
      },
    });
  }

  private async notifyLeaveManagers(params: {
    cinemaId: number;
    excludeUserId?: number;
    title: string;
    message: string;
    type: string;
  }) {
    const managers = await this.getLeaveManagers(
      params.cinemaId,
      params.excludeUserId,
    );

    await Promise.all(
      managers.map((manager) =>
        this.notificationsService.create({
          userId: manager.id,
          cinemaId: params.cinemaId,
          title: params.title,
          message: params.message,
          type: params.type,
          linkUrl: '/leave-approval',
        }),
      ),
    );
  }

  private async notifyUser(params: {
    userId: number;
    cinemaId: number;
    title: string;
    message: string;
    type: string;
  }) {
    await this.notificationsService.create({
      userId: params.userId,
      cinemaId: params.cinemaId,
      title: params.title,
      message: params.message,
      type: params.type,
      linkUrl: '/leave-requests',
    });
  }

  private async getActorName(userId: number) {
    const actor = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    return formatUserName(actor ?? undefined);
  }

  private async notifyLeaveRequestCreated(
    leaveRequest: LeaveRequestWithUser,
    actorUserId: number,
  ) {
    const employeeName = formatUserName(leaveRequest.user);
    const period = formatLeavePeriod(
      leaveRequest.startDate,
      leaveRequest.endDate,
    );

    await this.notifyLeaveManagers({
      cinemaId: leaveRequest.cinemaId,
      excludeUserId: actorUserId,
      title: 'Ny fraværsansøgning',
      message: `${period}\n${employeeName} har anmodet om fravær.`,
      type: 'LEAVE_REQUEST_CREATED',
    });
  }

  private async notifyLeaveRequestStatusChanged(params: {
    leaveRequest: LeaveRequestWithUser;
    actorUserId: number;
    status: LeaveStatus;
  }) {
    const actorName = await this.getActorName(params.actorUserId);
    const period = formatLeavePeriod(
      params.leaveRequest.startDate,
      params.leaveRequest.endDate,
    );

    if (params.status === 'APPROVED') {
      if (params.leaveRequest.userId !== params.actorUserId) {
        await this.notifyUser({
          userId: params.leaveRequest.userId,
          cinemaId: params.leaveRequest.cinemaId,
          title: 'Fravær godkendt',
          message: `${period}\n${actorName} har godkendt dit fravær.`,
          type: 'LEAVE_REQUEST_APPROVED',
        });
      }

      return;
    }

    if (params.status === 'REJECTED') {
      if (params.leaveRequest.userId !== params.actorUserId) {
        await this.notifyUser({
          userId: params.leaveRequest.userId,
          cinemaId: params.leaveRequest.cinemaId,
          title: 'Fravær afvist',
          message: `${period}\n${actorName} har afvist dit fravær.`,
          type: 'LEAVE_REQUEST_REJECTED',
        });
      }

      return;
    }

    const isCancelledByOwner =
      params.status === 'CANCELLED' &&
      params.leaveRequest.userId === params.actorUserId;

    if (isCancelledByOwner) {
      const employeeName = formatUserName(params.leaveRequest.user);

      await this.notifyLeaveManagers({
        cinemaId: params.leaveRequest.cinemaId,
        excludeUserId: params.actorUserId,
        title: 'Fravær annulleret',
        message: `${period}\n${employeeName} har annulleret sin fraværsansøgning.`,
        type: 'LEAVE_REQUEST_CANCELLED_BY_EMPLOYEE',
      });

      return;
    }

    if (params.leaveRequest.userId !== params.actorUserId) {
      await this.notifyUser({
        userId: params.leaveRequest.userId,
        cinemaId: params.leaveRequest.cinemaId,
        title: 'Fravær annulleret',
        message: `${period}\n${actorName} har annulleret dit fravær.`,
        type: 'LEAVE_REQUEST_CANCELLED_BY_ADMIN',
      });
    }
  }

  private async analyzeAbsenceImpact(leaveRequest: {
    id: number;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  }) {
    try {
      return await this.absenceImpactEngineService.analyzeLeaveImpact({
        leaveRequestId: leaveRequest.id,
        userId: leaveRequest.userId,
        cinemaId: leaveRequest.cinemaId,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
      });
    } catch (error) {
      console.error('Absence impact analysis failed', error);
      return null;
    }
  }

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
    },
  ) {
    const userId = requireUserId(user);
    const cinemaId = resolveLeaveCinemaId(user);

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    validateLeaveRequestDates(startDate, endDate);

    await this.ensureNoOverlappingShift(userId, cinemaId, startDate, endDate);

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        startDate,
        endDate,
        reason: data.reason,
        cinemaId,
        userId,
      },
      include: {
        user: true,
      },
    });

    await this.notifyLeaveRequestCreated(leaveRequest, userId);

    this.notifyLeaveRequestsUpdated(leaveRequest.cinemaId);

    const absenceImpact = await this.analyzeAbsenceImpact(leaveRequest);

    return {
      leaveRequest,
      absenceImpact,
    };
  }

  async updateStatus(
    user: AuthUser,
    id: number,
    status: LeaveStatus,
    selectedCinemaId?: number | null,
  ) {
    const userId = requireUserId(user);
    const cinemaId = resolveLeaveCinemaId(user, selectedCinemaId);

    const existing = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fraværsansøgningen blev ikke fundet.');
    }

    ensureLeaveStatusChangeAllowed({
      actorUserId: userId,
      existing,
      isAdmin: user.role === 'ADMIN' || user.role === 'MASTER',
      status,
    });

    if (status === 'APPROVED') {
      validateLeaveRequestDates(existing.startDate, existing.endDate);

      await this.ensureNoOverlappingShift(
        existing.userId,
        existing.cinemaId,
        existing.startDate,
        existing.endDate,
      );
    }

    const leaveRequest = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status },
      include: {
        user: true,
      },
    });

    await this.notifyLeaveRequestStatusChanged({
      leaveRequest,
      actorUserId: userId,
      status,
    });

    this.notifyLeaveRequestsUpdated(leaveRequest.cinemaId);

    let absenceImpact: any = null;

    if (status === 'APPROVED') {
      absenceImpact = await this.analyzeAbsenceImpact(leaveRequest);
    }

    return {
      leaveRequest,
      absenceImpact,
    };
  }
}
