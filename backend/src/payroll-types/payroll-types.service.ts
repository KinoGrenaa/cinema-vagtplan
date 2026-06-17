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
export class PayrollTypesService {
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
          'Vælg en biograf, før du administrerer lønarter.',
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

  async findAll(user: AuthUser, selectedCinemaId?: CinemaContextValue) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(user, selectedCinemaId);

    return this.prisma.payrollType.findMany({
      where: {
        cinemaId,
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
      payrollCode: string;
      exportCode?: string;
      description?: string;
      color?: string;
      isDefault?: boolean;
      cinemaId?: CinemaContextValue;
    },
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(user, data.cinemaId);

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        cinemaId,
        payrollCode: data.payrollCode,
      },
    });

    if (existing) {
      throw new BadRequestException('Lønart med denne kode findes allerede');
    }

    if (data.isDefault) {
      await this.prisma.payrollType.updateMany({
        where: {
          cinemaId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return this.prisma.payrollType.create({
      data: {
        cinemaId,
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
      cinemaId?: CinemaContextValue;
    },
    selectedCinemaId?: CinemaContextValue,
  ) {
    this.ensureAdmin(user);

    const cinemaId = this.getRequiredCinemaId(
      user,
      selectedCinemaId ?? data.cinemaId,
    );

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        id,
        cinemaId,
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
      data: {
        name: data.name,
        payrollCode: data.payrollCode,
        exportCode: data.exportCode,
        description: data.description,
        color: data.color,
        isDefault: data.isDefault,
        isActive: data.isActive,
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

    const existing = await this.prisma.payrollType.findFirst({
      where: {
        id,
        cinemaId,
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
