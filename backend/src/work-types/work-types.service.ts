import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './helpers/work-type-service-helpers';
import {
  ensureWorkTypeAdmin,
  getPayrollTypeIdForCinema,
  getRequiredWorkTypeCinemaId,
} from './helpers/work-type-service-helpers';

@Injectable()
export class WorkTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    includeArchived = false,
    selectedCinemaId?: CinemaContextValue,
  ) {
    const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

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
    ensureWorkTypeAdmin(user);

    const cinemaId = getRequiredWorkTypeCinemaId(user, data.cinemaId);
    const payrollTypeId = await getPayrollTypeIdForCinema(
      this.prisma,
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
    ensureWorkTypeAdmin(user);

    const cinemaId = getRequiredWorkTypeCinemaId(
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
        : await getPayrollTypeIdForCinema(
            this.prisma,
            cinemaId,
            data.payrollTypeId,
          );

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
    ensureWorkTypeAdmin(user);

    const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

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
    ensureWorkTypeAdmin(user);

    const cinemaId = getRequiredWorkTypeCinemaId(user, selectedCinemaId);

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
