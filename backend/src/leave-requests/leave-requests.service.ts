import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';

type AuthUser = {
  sub?: number;
  id?: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
};

type LeaveStatus = 'APPROVED' | 'REJECTED' | 'CANCELLED';

type LeaveRequestWithUser = {
  id: number;
  userId: number;
  cinemaId: number;
  startDate: Date;
  endDate: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

@Injectable()
export class LeaveRequestsService {
  constructor(
    private prisma: PrismaService,
    private absenceImpactEngineService: AbsenceImpactEngineService,
    private realtimeGateway: RealtimeGateway,
    private notificationsService: NotificationsService,
  ) {}

  private getUserId(user: AuthUser) {
    return user.sub ?? user.id;
  }

  private getTomorrowStart() {
    const tomorrow = new Date();

    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tomorrow;
  }

  private validateDates(startDate: Date, endDate: Date) {
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Ugyldig dato eller tid.');
    }

    if (startDate < this.getTomorrowStart()) {
      throw new BadRequestException(
        'Du kan ikke anmode om fri i dag eller tilbage i tiden.',
      );
    }

    if (endDate <= startDate) {
      throw new BadRequestException(
        'Sluttidspunkt skal være efter starttidspunkt.',
      );
    }
  }

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
      const shiftDate = shift.startTime.toLocaleDateString('da-DK', {
        timeZone: 'Europe/Copenhagen',
      });

      const shiftStart = shift.startTime.toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Copenhagen',
      });

      const shiftEnd = shift.endTime.toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Copenhagen',
      });

      const workTypeName = shift.workType?.name
        ? `${shift.workType.name}-vagt`
        : 'vagt';

      throw new BadRequestException(
        `Du har en ${workTypeName} den ${shiftDate} kl. ${shiftStart}-${shiftEnd}. Byt vagten først, eller kontakt din planlægger, før du søger fravær.`,
      );
    }
  }

  private notifyLeaveRequestsUpdated(cinemaId: number) {
    this.realtimeGateway.notifyCinema(cinemaId, 'leaveRequestsUpdated', {
      cinemaId,
    });
  }

  private formatUserName(user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  }) {
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();

    return fullName || user?.email || 'Ukendt bruger';
  }

  private pad(value: number) {
    return value.toString().padStart(2, '0');
  }

  private formatDate(date: Date) {
    return new Intl.DateTimeFormat('da-DK', {
      timeZone: 'Europe/Copenhagen',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date) {
    return new Intl.DateTimeFormat('da-DK', {
      timeZone: 'Europe/Copenhagen',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  private isSameUtcDate(left: Date, right: Date) {
    return (
      left.getUTCFullYear() === right.getUTCFullYear() &&
      left.getUTCMonth() === right.getUTCMonth() &&
      left.getUTCDate() === right.getUTCDate()
    );
  }

  private isAllDay(startDate: Date, endDate: Date) {
    return (
      startDate.getUTCHours() === 0 &&
      startDate.getUTCMinutes() === 0 &&
      endDate.getUTCHours() === 23 &&
      endDate.getUTCMinutes() === 59
    );
  }

  private formatLeavePeriod(startDate: Date, endDate: Date) {
    const startDateText = this.formatDate(startDate);
    const endDateText = this.formatDate(endDate);
    const sameDate = this.isSameUtcDate(startDate, endDate);
    const allDay = this.isAllDay(startDate, endDate);

    if (sameDate && allDay) {
      return startDateText;
    }

    if (sameDate) {
      return `${startDateText} kl. ${this.formatTime(startDate)}-${this.formatTime(
        endDate,
      )}`;
    }

    if (allDay) {
      return `${startDateText} - ${endDateText}`;
    }

    return `${startDateText} kl. ${this.formatTime(
      startDate,
    )} - ${endDateText} kl. ${this.formatTime(endDate)}`;
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

    return this.formatUserName(actor ?? undefined);
  }

  private async notifyLeaveRequestCreated(
    leaveRequest: LeaveRequestWithUser,
    actorUserId: number,
  ) {
    const employeeName = this.formatUserName(leaveRequest.user);
    const period = this.formatLeavePeriod(
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
    const period = this.formatLeavePeriod(
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
      const employeeName = this.formatUserName(params.leaveRequest.user);

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

  findAll(user: AuthUser) {
    const userId = this.getUserId(user);
    const isAdmin = user.role === 'ADMIN' || user.role === 'MASTER';

    return this.prisma.leaveRequest.findMany({
      where: {
        cinemaId: user.cinemaId,
        ...(isAdmin ? {} : { userId }),
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
    const userId = this.getUserId(user);

    if (!userId) {
      throw new ForbiddenException('Brugeren kunne ikke identificeres.');
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    this.validateDates(startDate, endDate);

    await this.ensureNoOverlappingShift(
      userId,
      user.cinemaId,
      startDate,
      endDate,
    );

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        startDate,
        endDate,
        reason: data.reason,
        cinemaId: user.cinemaId,
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

  async updateStatus(user: AuthUser, id: number, status: LeaveStatus) {
    const userId = this.getUserId(user);

    if (!userId) {
      throw new ForbiddenException('Brugeren kunne ikke identificeres.');
    }

    const existing = await this.prisma.leaveRequest.findFirst({
      where: {
        id,
        cinemaId: user.cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Fraværsansøgningen blev ikke fundet.');
    }

    const isAdmin = user.role === 'ADMIN' || user.role === 'MASTER';
    const isOwner = existing.userId === userId;

    if (status === 'CANCELLED') {
      if (!isAdmin && !isOwner) {
        throw new ForbiddenException(
          'Du kan kun annullere dine egne fraværsansøgninger.',
        );
      }

      if (existing.status === 'REJECTED' || existing.status === 'CANCELLED') {
        throw new BadRequestException(
          'Denne fraværsansøgning kan ikke annulleres.',
        );
      }
    } else {
      if (!isAdmin) {
        throw new ForbiddenException(
          'Kun administratorer kan godkende eller afvise fravær.',
        );
      }
    }

    if (status === 'APPROVED') {
      this.validateDates(existing.startDate, existing.endDate);

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
