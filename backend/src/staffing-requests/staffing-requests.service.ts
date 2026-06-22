import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { StaffingAiService } from '../staffing-ai/staffing-ai.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

type CreateStaffingRequestInput = CreateStaffingRequestDto & {
  cinemaId?: number | null;
};

const requestInclude = {
  cinema: true,
  shift: {
    include: {
      user: true,
      workType: true,
    },
  },
  requestedByUser: true,
  targetUser: true,
};

@Injectable()
export class StaffingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly staffingAiService: StaffingAiService,
  ) {}

  private resolveCinemaId(user: AuthUser, selectedCinemaId?: number | null) {
    if (user.role === 'MASTER') {
      if (!selectedCinemaId) {
        throw new BadRequestException(
          'Vælg en biograf, før du administrerer bemandingsforespørgsler.',
        );
      }

      return selectedCinemaId;
    }

    if (!user.cinemaId) {
      throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
    }

    return user.cinemaId;
  }

  private canManageStaffing(user: AuthUser) {
    return user.role === 'MASTER' || user.role === 'ADMIN';
  }

  private emitUpdate(cinemaId: number) {
    this.realtimeGateway.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestsUpdated', {
        cinemaId,
      });
  }

  async findAll(user: AuthUser, selectedCinemaId?: number | null) {
    if (!this.canManageStaffing(user)) {
      return this.findMine(user, selectedCinemaId);
    }

    const cinemaId = this.resolveCinemaId(user, selectedCinemaId);

    return this.prisma.staffingRequest.findMany({
      where: {
        cinemaId,
      },
      include: requestInclude,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findMine(user: AuthUser, selectedCinemaId?: number | null) {
    const cinemaId = this.resolveCinemaId(user, selectedCinemaId);

    return this.prisma.staffingRequest.findMany({
      where: {
        cinemaId,
        OR: [
          { targetUserId: user.sub },
          { requestedByUserId: user.sub },
          { targetUserId: null },
        ],
      },
      include: requestInclude,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(user: AuthUser, dto: CreateStaffingRequestInput) {
    if (!this.canManageStaffing(user)) {
      throw new ForbiddenException(
        'Du må ikke oprette bemandingsforespørgsler',
      );
    }

    const cinemaId = this.resolveCinemaId(user, dto.cinemaId);

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

    const shift = dto.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: dto.shiftId,
            cinemaId,
          },
        })
      : null;

    if (dto.shiftId && !shift) {
      throw new NotFoundException('Vagt blev ikke fundet');
    }

    const request = await this.prisma.staffingRequest.create({
      data: {
        cinemaId,
        requestedByUserId: user.sub,
        targetUserId: dto.targetUserId ?? null,
        shiftId: dto.shiftId ?? null,
        type: dto.type,
        priority: dto.priority ?? 1,
        message: dto.message,
        aiGenerated: dto.aiGenerated ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: requestInclude,
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

    if (user.role !== 'EMPLOYEE') {
      throw new ForbiddenException(
        'Kun medarbejdere kan acceptere bemandingsforespørgsler',
      );
    }

    if (request.targetUserId && request.targetUserId !== user.sub) {
      throw new ForbiddenException('Du kan ikke acceptere denne forespørgsel');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: {
        id,
      },
      data: {
        status: StaffingRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: requestInclude,
    });

    if (!updated.shiftId) {
      const defaultWorkType = await this.prisma.workType.findFirst({
        where: {
          cinemaId: updated.cinemaId,
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (defaultWorkType) {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setMinutes(0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        await this.prisma.shift.create({
          data: {
            cinemaId: updated.cinemaId,
            userId: user.sub,
            workTypeId: defaultWorkType.id,
            startTime,
            endTime,
            note: `Auto-created from staffing request #${updated.id}`,
          },
        });

        const admins = await this.prisma.user.findMany({
          where: {
            cinemaId: updated.cinemaId,
            role: 'ADMIN',
          },
          select: {
            id: true,
          },
        });

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

    return updated;
  }

  async reject(user: AuthUser, id: number, selectedCinemaId?: number | null) {
    const request = await this.findOneForUser(user, id, selectedCinemaId);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException(
        'Bemandingsforespørgslen er ikke længere åben',
      );
    }

    if (user.role !== 'EMPLOYEE') {
      throw new ForbiddenException(
        'Kun medarbejdere kan afvise bemandingsforespørgsler',
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
      include: requestInclude,
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async cancel(user: AuthUser, id: number, selectedCinemaId?: number | null) {
    if (!this.canManageStaffing(user)) {
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
      include: requestInclude,
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
    const cinemaId = this.resolveCinemaId(user, selectedCinemaId);

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

    if (!request || !request.targetUserId) return;

    await this.prisma.notification.create({
      data: {
        cinemaId: request.cinemaId,
        userId: request.targetUserId,
        title: 'Ny bemandingsforespørgsel',
        message:
          request.message ||
          'Der er brug for ekstra bemanding. Kan du tage en vagt?',
        type: 'STAFFING_REQUEST',
        linkUrl: '/staffing-requests',
      },
    });
  }
}
