import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type AuthUser = {
  sub: number;
  email?: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number | null;
};

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  private resolveCinemaId(user: AuthUser, selectedCinemaId?: number | null) {
    if (user.role === 'MASTER') {
      if (!selectedCinemaId) {
        throw new BadRequestException(
          'Vælg en biograf, før du administrerer medarbejderdokumenter.',
        );
      }

      return selectedCinemaId;
    }

    if (!user.cinemaId) {
      throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
    }

    return user.cinemaId;
  }

  async findForUser(
    user: AuthUser,
    userId: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = this.resolveCinemaId(user, selectedCinemaId);
    const targetUserId = user.role === 'EMPLOYEE' ? user.sub : userId;

    return this.prisma.employeeDocument.findMany({
      where: {
        userId: targetUserId,
        user: {
          cinemaId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    user: AuthUser,
    data: {
      userId: number;
      title: string;
      fileUrl: string;
      fileName: string;
      fileType?: string;
      cinemaId?: number | null;
    },
  ) {
    const cinemaId = this.resolveCinemaId(user, data.cinemaId);

    if (user.role === 'EMPLOYEE' && data.userId !== user.sub) {
      throw new ForbiddenException(
        'Du kan kun uploade dokumenter til dig selv',
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: data.userId,
        cinemaId,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Brugeren blev ikke fundet i denne biograf');
    }

    return this.prisma.employeeDocument.create({
      data: {
        userId: data.userId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
      },
    });
  }

  async delete(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    const cinemaId = this.resolveCinemaId(user, selectedCinemaId);

    const document = await this.prisma.employeeDocument.findFirst({
      where: {
        id,
        user: {
          cinemaId,
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Dokumentet blev ikke fundet');
    }

    if (user.role === 'EMPLOYEE' && document.userId !== user.sub) {
      throw new ForbiddenException('Du har ikke adgang til dette dokument');
    }

    return this.prisma.employeeDocument.delete({
      where: {
        id,
      },
    });
  }
}
