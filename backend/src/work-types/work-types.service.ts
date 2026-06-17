import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

type CinemaContextValue = number | string | null | undefined;

@Injectable()
export class WorkTypesService {
  constructor(private prisma: PrismaService) {}

  private ensureAdmin(user: AuthUser) {
    if (user.role === 'MASTER') return;
    if (user.role === 'ADMIN') return;

    throw new ForbiddenException('Ingen adgang');
  }

  private parseCinemaId(value: CinemaContextValue) {
    const cinemaId = Number(value);

    if (!Number.isFinite(cinemaId) || cinemaId <= 0) {
      return null;
    }

    return cinemaId;
  }

  private getRequiredCinemaId(
    user: AuthUser,
    selectedCinemaId?: CinemaContextValue,
  ) {
    if (user.role === 'MASTER') {
      const cinemaId = this.parseCinemaId(selectedCinemaId);

      if (!cinemaId) {
        throw new BadRequestException(
          'Vælg en biograf, før du administrerer vagttyper.',
        );
      }

      return cinemaId;
    }

    const cinemaId = this.parseCinemaId(user.cinemaId);

    if (!cinemaId) {
      throw new BadRequestException('Brugeren mangler biograf.');
    }

    return cinemaId;
  }

  private async getPayrollTypeIdForCinema(
    cinemaId: number,
    payrollTypeId?: number | null,
  ) {
    if (!payrollTypeId) {
      return null;
    }

    const payrollType = await this.prisma.payrollType.findFirst({
      where: {
        id: payrollTypeId,
        cinemaId,
      },
    });

    if (!payrollType) {
      throw new BadRequestException(
        'Lønarten blev ikke fundet for den valgte biograf.',
      );
    }

    return payrollType.id;
  }

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    const cinemaId = this.getRequiredCinemaId(user, selectedCinemaId);

    return this.prisma.workType.findMany({
      where: {
        cinemaId,
        ...(includeArchived ? {} : { isActive: true }),
      },

      include: {
        payrollType: true,
      },

      orderBy: [
        {
          isActive: 'desc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      color?: string;
      payrollTypeId?: number | null;
      cinemaId?: CinemaContextValue;
    },
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(user, data.cinemaId);
    const payrollTypeId = await this.getPayrollTypeIdForCinema(
      cinemaId,
      data.payrollTypeId,
    );

    const existing = await this.prisma.workType.findFirst({
      where: {
        name: data.name,
        isActive: true,
        cinemaId,
      },
    });

    if (existing) {
      throw new BadRequestException('Aktiv vagttype findes allerede');
    }

    return this.prisma.workType.create({
      data: {
        name: data.name,
        color: data.color,

        cinemaId,

        payrollTypeId,
        isActive: true,
        archivedAt: null,
      },

      include: {
        payrollType: true,
      },
    });
  }

  async update(
    user: AuthUser,
    id: number,
    data: {
      name?: string;
      color?: string;
      payrollTypeId?: number | null;
      cinemaId?: CinemaContextValue;
    },
    selectedCinemaId?: CinemaContextValue,
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(
      user,
      selectedCinemaId ?? data.cinemaId,
    );

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vagttype blev ikke fundet');
    }

    if (data.name && data.name !== existing.name) {
      const duplicate = await this.prisma.workType.findFirst({
        where: {
          name: data.name,
          isActive: true,
          id: {
            not: id,
          },
          cinemaId,
        },
      });

      if (duplicate) {
        throw new BadRequestException('Aktiv vagttype findes allerede');
      }
    }

    const payrollTypeId =
      data.payrollTypeId === undefined
        ? undefined
        : await this.getPayrollTypeIdForCinema(cinemaId, data.payrollTypeId);

    return this.prisma.workType.update({
      where: {
        id,
      },

      data: {
        name: data.name,
        color: data.color,
        payrollTypeId,
      },

      include: {
        payrollType: true,
      },
    });
  }

  async remove(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(user, selectedCinemaId);

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vagttype blev ikke fundet');
    }

    if (!existing.isActive) {
      throw new BadRequestException('Vagttypen er allerede arkiveret');
    }

    return this.prisma.workType.update({
      where: {
        id,
      },

      data: {
        isActive: false,
        archivedAt: new Date(),
      },

      include: {
        payrollType: true,
      },
    });
  }

  async reactivate(
    user: AuthUser,
    id: number,
    selectedCinemaId?: CinemaContextValue,
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(user, selectedCinemaId);

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        cinemaId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Vagttype blev ikke fundet');
    }

    if (existing.isActive) {
      throw new BadRequestException('Vagttypen er allerede aktiv');
    }

    const duplicate = await this.prisma.workType.findFirst({
      where: {
        name: existing.name,
        isActive: true,
        id: {
          not: id,
        },
        cinemaId,
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Der findes allerede en aktiv vagttype med samme navn',
      );
    }

    return this.prisma.workType.update({
      where: {
        id,
      },

      data: {
        isActive: true,
        archivedAt: null,
      },

      include: {
        payrollType: true,
      },
    });
  }
}
