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
export class PayrollTypesService {
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
    this.ensureAdmin(user);

    return this.prisma.payrollType.findMany({
      where: this.getCinemaFilter(user),
      orderBy: {
        name: 'asc',
      },
    });
  }

  async create(
    user: AuthUser,
    data: {
      name: string;
      payrollCode: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
    },
  ) {
    this.ensureAdmin(user);

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        cinemaId: user.cinemaId,
        payrollCode: data.payrollCode,
      },
    });

    if (existing) {
      throw new BadRequestException('Lønart med denne kode findes allerede');
    }

    if (data.isDefault) {
      await this.prisma.payrollType.updateMany({
        where: {
          cinemaId: user.cinemaId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.payrollType.create({
      data: {
        cinemaId: user.cinemaId,
        name: data.name,
        payrollCode: data.payrollCode,
        exportCode: data.exportCode,
        description: data.description,
        color: data.color,
        isDefault: data.isDefault || false,
      },
    });
  }

  async update(
    user: AuthUser,
    id: number,
    data: {
      name?: string;
      payrollCode?: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      isActive?: boolean;
    },
  ) {
    this.ensureAdmin(user);

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
      },
    });

    if (!existing) {
      throw new NotFoundException('Lønart blev ikke fundet');
    }

    if (data.isDefault) {
      await this.prisma.payrollType.updateMany({
        where: {
          cinemaId: existing.cinemaId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.payrollType.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(user: AuthUser, id: number) {
    this.ensureAdmin(user);

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
      },
    });

    if (!existing) {
      throw new NotFoundException('Lønart blev ikke fundet');
    }

    return this.prisma.payrollType.delete({
      where: {
        id,
      },
    });
  }
}
