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
  cinemaId: number;
};

@Injectable()
export class WorkTypesService {
  constructor(private prisma: PrismaService) {}

  private ensureAdmin(user: AuthUser) {
    if (user.role === 'MASTER') return;
    if (user.role === 'ADMIN') return;

    throw new ForbiddenException('Ingen adgang');
  }

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

  async findAll(user: AuthUser, includeArchived = false) {
    return this.prisma.workType.findMany({
      where: {
        ...this.getCinemaFilter(user),
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
      payrollTypeId?: number;
    },
  ) {
    this.ensureAdmin(user);

    const existing = await this.prisma.workType.findFirst({
      where: {
        name: data.name,
        isActive: true,
        ...this.getCinemaFilter(user),
      },
    });

    if (existing) {
      throw new BadRequestException('Aktiv vagttype findes allerede');
    }

    return this.prisma.workType.create({
      data: {
        name: data.name,
        color: data.color,

        cinemaId: user.cinemaId,

        payrollTypeId: data.payrollTypeId || null,
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
    },
  ) {
    this.ensureAdmin(user);

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
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
          ...this.getCinemaFilter(user),
        },
      });

      if (duplicate) {
        throw new BadRequestException('Aktiv vagttype findes allerede');
      }
    }

    return this.prisma.workType.update({
      where: {
        id,
      },

      data: {
        ...data,

        payrollTypeId:
          data.payrollTypeId === undefined ? undefined : data.payrollTypeId,
      },

      include: {
        payrollType: true,
      },
    });
  }

  async remove(user: AuthUser, id: number) {
    this.ensureAdmin(user);

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
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

  async reactivate(user: AuthUser, id: number) {
    this.ensureAdmin(user);

    const existing = await this.prisma.workType.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
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
        ...this.getCinemaFilter(user),
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
