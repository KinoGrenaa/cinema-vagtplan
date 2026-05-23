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

  async findAll(user: AuthUser) {
    return this.prisma.workType.findMany({
      where: this.getCinemaFilter(user),

      include: {
        payrollType: true,
      },

      orderBy: {
        name: 'asc',
      },
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
        ...this.getCinemaFilter(user),
      },
    });

    if (existing) {
      throw new BadRequestException('Vagttype findes allerede');
    }

    return this.prisma.workType.create({
      data: {
        name: data.name,
        color: data.color,

        cinemaId: user.cinemaId,

        payrollTypeId: data.payrollTypeId || null,
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

    return this.prisma.workType.update({
      where: {
        id,
      },

      data: {
        ...data,

        payrollTypeId: data.payrollTypeId || null,
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

    return this.prisma.workType.delete({
      where: {
        id,
      },
    });
  }
}
