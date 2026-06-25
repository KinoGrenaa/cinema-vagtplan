import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { StaffingAiService } from '../staffing-ai/staffing-ai.service';
import {
  AuthUser,
  canManageStaffing,
  CreateStaffingRequestInput,
  parseStaffingRequestDate,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './helpers/staffing-request-helpers';

@Injectable()
export class StaffingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly staffingAiService: StaffingAiService,
  ) {}

  private emitUpdate(cinemaId: number) {
    this.realtimeGateway.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestsUpdated', {
        cinemaId,
      });
  }

  async findAll(user: AuthUser, selectedCinemaId?: number | null) {
    if (!canManageStaffing(user)) {
      return this.findMine(user, selectedCinemaId);
    }

    const cinemaId = resolveStaffingCinemaId(user, selectedCinemaId);

    return this.prisma.staffingRequest.findMany({
      where: {
        cinemaId,
      },
      include: staffingRequestInclude,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findMine(user: AuthUser, selectedCinemaId?: number | null) {
    const cinemaId = resolveStaffingCinemaId(user, selectedCinemaId);

    return this.prisma.staffingRequest.findMany({
      where: {
        cinemaId,
        OR: [
          { targetUserId: user.sub },
          { requestedByUserId: user.sub },
          { targetUserId: null },
        ],
      },
      include: staffingRequestInclude,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(user: AuthUser, dto: CreateStaffingRequestInput) {
    if (!canManageStaffing(user)) {
      throw new ForbiddenException(
        'Du må ikke oprette bemandingsforespørgsler',
      );
    }

    const cinemaId = resolveStaffingCinemaId(user, dto.cinemaId);

    const targetUser = dto.targetUserId
      ? await this.prisma.user.findFirst({
          where: {
            id: dto.targetUserId,
            cinemaId,
          },
        })
      : null;

    if (dto.targetUserId && !targetUser) {
      throw new NotFoundException('Medarbejder blev ikke fundet');
    }

    let shift = dto.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: dto.shiftId,
            cinemaId,
          },
          include: {
            user: true,
            workType: true,
          },
        })
      : null;

    if (dto.shiftId && !shift) {
      throw new NotFoundException('Vagt blev ikke fundet');
    }

    const requestStartTime = shift
      ? shift.startTime
      : parseStaffingRequestDate(dto.requestStartTime);
    const requestEndTime = shift
      ? shift.endTime
      : parseStaffingRequestDate(dto.requestEndTime);

    if (!shift && (!requestStartTime || !requestEndTime)) {
      throw new BadRequestException(
        'Vælg dato og tidsinterval for bemandingsbehovet.',
      );
    }

    if (
      requestStartTime &&
      requestEndTime &&
      requestEndTime <= requestStartTime
    ) {
      throw new BadRequestException(
        'Sluttidspunktet skal være efter starttidspunktet.',
      );
    }

    const requestedWorkTypeId = shift?.workTypeId ?? dto.workTypeId ?? null;

    if (!requestedWorkTypeId) {
      throw new BadRequestException('Vælg jobfunktion for bemandingsbehovet.');
    }

    const workType = await this.prisma.workType.findFirst({
      where: {
        id: requestedWorkTypeId,
        cinemaId,
      },
    });

    if (!workType) {
      throw new NotFoundException('Jobfunktionen blev ikke fundet');
    }

    if (!shift) {
      shift = await this.prisma.shift.create({
        data: {
          cinemaId,
          userId: null,
          workTypeId: requestedWorkTypeId,
          startTime: requestStartTime!,
          endTime: requestEndTime!,
          note:
            dto.message?.trim() ||
            'Ikke tildelt vagt oprettet fra bemandingsforespørgsel',
        },
        include: {
          user: true,
          workType: true,
        },
      });

      this.realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', shift);
    }

    const request = await this.prisma.staffingRequest.create({
      data: {
        cinemaId,
        requestedByUserId: user.sub,
        targetUserId: dto.targetUserId ?? null,
        shiftId: shift.id,
        requestStartTime: shift.startTime,
        requestEndTime: shift.endTime,
        workTypeId: requestedWorkTypeId,
        type: dto.type,
        priority: dto.priority ?? 1,
        message: dto.message,
        aiGenerated: dto.aiGenerated ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: staffingRequestInclude,
    });

    await this.createNotificationForRequest(request.id);
    this.emitUpdate(request.cinemaId);

    return request;
  }

  async accept(user: AuthUser, id: number, selectedCinemaId?: number | null) {
    const request = await this.findOneForUser(user, id, selectedCinemaId);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere åben',
      );
    }

    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Kun medarbejdere og administratorer kan acceptere bemandingsforespørgsler',
      );
    }

    if (request.targetUserId && request.targetUserId !== user.sub) {
      throw new ForbiddenException('Du kan ikke acceptere denne forespørgsel');
    }

    const requestShift = request.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: request.shiftId,
            cinemaId: request.cinemaId,
          },
          select: {
            id: true,
            userId: true,
            startTime: true,
            endTime: true,
          },
        })
      : null;

    if (request.shiftId && !requestShift) {
      throw new NotFoundException('Vagt blev ikke fundet');
    }

    if (requestShift?.userId && requestShift.userId !== user.sub) {
      throw new BadRequestException(
        'Vagten er allerede tildelt en anden medarbejder.',
      );
    }

    const startTime = requestShift?.startTime ?? request.requestStartTime;
    const endTime = requestShift?.endTime ?? request.requestEndTime;

    if (!startTime || !endTime) {
      throw new BadRequestException(
        'Bemandingsforespørgslen mangler et gyldigt tidsinterval.',
      );
    }

    const overlappingShift = await this.prisma.shift.findFirst({
      where: {
        cinemaId: request.cinemaId,
        userId: user.sub,
        id: requestShift
          ? {
              not: requestShift.id,
            }
          : undefined,
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
      },
      select: {
        id: true,
      },
    });

    if (overlappingShift) {
      throw new BadRequestException(
        'Du har allerede en vagt i det tidsrum.',
      );
    }

    const updated = await this.prisma.staffingRequest.update({
      where: {
        id,
      },
      data: {
        status: StaffingRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: staffingRequestInclude,
    });

    if (updated.shiftId && updated.shift && !updated.shift.userId) {
      const assignedShift = await this.prisma.shift.update({
        where: {
          id: updated.shiftId,
        },
        data: {
          userId: user.sub,
        },
        include: {
          user: true,
          workType: true,
        },
      });

      this.realtimeGateway.notifyCinema(
        updated.cinemaId,
        'shiftsUpdated',
        assignedShift,
      );

      const admins = await this.prisma.user.findMany({
        where: {
          cinemaId: updated.cinemaId,
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      if (admins.length > 0) {
        await this.prisma.notification.createMany({
          data: admins.map((admin) => ({
            cinemaId: updated.cinemaId,
            userId: admin.id,
            title: 'Bemandingsforespørgsel accepteret',
            message: `${user.email} accepterede bemandingsforespørgsel #${updated.id}`,
            type: 'STAFFING_ACCEPTED',
            linkUrl: '/staffing-requests',
          })),
        });
      }
    }

    if (updated.shiftId) {
      await this.prisma.staffingRequest.updateMany({
        where: {
          cinemaId: updated.cinemaId,
          id: {
            not: updated.id,
          },
          shiftId: updated.shiftId,
          status: StaffingRequestStatus.PENDING,
        },
        data: {
          status: StaffingRequestStatus.CANCELLED,
        },
      });
    }

    this.emitUpdate(updated.cinemaId);

    return this.prisma.staffingRequest.findUnique({
      where: {
        id: updated.id,
      },
      include: staffingRequestInclude,
    });
  }

  async reject(user: AuthUser, id: number, selectedCinemaId?: number | null) {
    const request = await this.findOneForUser(user, id, selectedCinemaId);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere åben',
      );
    }

    if (user.role !== 'EMPLOYEE' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Kun medarbejdere og administratorer kan afvise bemandingsforespørgsler',
      );
    }

    if (!request.targetUserId) {
      throw new ForbiddenException(
        'En forespørgsel til alle medarbejdere kan ikke afvises individuelt.',
      );
    }

    if (request.targetUserId !== user.sub) {
      throw new ForbiddenException('Du kan ikke afvise denne forespørgsel');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: {
        id,
      },
      data: {
        status: StaffingRequestStatus.REJECTED,
        rejectedAt: new Date(),
      },
      include: staffingRequestInclude,
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async cancel(user: AuthUser, id: number, selectedCinemaId?: number | null) {
    if (!canManageStaffing(user)) {
      throw new ForbiddenException(
        'Du må ikke annullere bemandingsforespørgsler',
      );
    }

    const request = await this.findOneForUser(user, id, selectedCinemaId);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException('Kun åbne forespørgsler kan annulleres');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: {
        id,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
      include: staffingRequestInclude,
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async createAiEmergencyRequests(params: {
    cinemaId: number;
    requestedByUserId: number;
    startTime: Date;
    endTime: Date;
    shiftId?: number;
    message?: string;
    limit?: number;
  }) {
    const candidates = await this.staffingAiService.getTopEmergencyCandidates(
      params.cinemaId,
      params.startTime,
      params.endTime,
      params.limit ?? 5,
    );

    const createdRequests: any[] = [];

    for (const candidate of candidates) {
      const request = await this.prisma.staffingRequest.create({
        data: {
          cinemaId: params.cinemaId,
          requestedByUserId: params.requestedByUserId,
          targetUserId: candidate.userId,
          shiftId: params.shiftId,
          type: 'EMERGENCY',
          status: StaffingRequestStatus.PENDING,
          priority: Math.max(1, Math.round(candidate.totalScore)),
          aiGenerated: true,
          message: params.message || 'Der er akut behov for ekstra bemanding.',
        },
        include: {
          targetUser: true,
          requestedByUser: true,
          shift: true,
        },
      });

      createdRequests.push({
        request,
        candidate,
      });

      await this.prisma.notification.create({
        data: {
          cinemaId: params.cinemaId,
          userId: candidate.userId,
          title: 'Akut bemandingsforespørgsel',
          message: params.message || 'Der er akut behov for ekstra bemanding.',
          type: 'STAFFING_REQUEST',
          linkUrl: '/staffing-requests',
        },
      });
    }

    this.realtimeGateway.notifyStaffingRequestsUpdated(params.cinemaId);

    return createdRequests;
  }

  private async findOneForUser(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = resolveStaffingCinemaId(user, selectedCinemaId);

    const request = await this.prisma.staffingRequest.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

    if (!request) {
      throw new NotFoundException('Bemandingsforespørgsel blev ikke fundet');
    }

    return request;
  }

  private async createNotificationForRequest(requestId: number) {
    const request = await this.prisma.staffingRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        targetUser: true,
        requestedByUser: true,
      },
    });

    if (!request) return;

    const notification = {
      title: 'Ny bemandingsforespørgsel',
      message:
        request.message ||
        'Der er brug for ekstra bemanding. Kan du tage en vagt?',
      type: 'STAFFING_REQUEST',
      linkUrl: '/staffing-requests',
    };

    if (request.targetUserId) {
      await this.prisma.notification.create({
        data: {
          cinemaId: request.cinemaId,
          userId: request.targetUserId,
          ...notification,
        },
      });

      return;
    }

    const staffUsers = await this.prisma.user.findMany({
      where: {
        cinemaId: request.cinemaId,
        role: {
          in: ['ADMIN', 'EMPLOYEE'],
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (staffUsers.length === 0) return;

    await this.prisma.notification.createMany({
      data: staffUsers.map((staffUser) => ({
        cinemaId: request.cinemaId,
        userId: staffUser.id,
        ...notification,
      })),
    });
  }
}
