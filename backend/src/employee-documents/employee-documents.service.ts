import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  private getUserCinemaFilter(user: any) {
    if (user.role === 'MASTER') {
      return {};
    }

    return {
      user: {
        cinemaId: user.cinemaId,
      },
    };
  }

  private getCinemaFilter(user: any) {
    if (user.role === 'MASTER') {
      return {};
    }

    return {
      cinemaId: user.cinemaId,
    };
  }

  findForUser(user: any, userId: number) {
    return this.prisma.employeeDocument.findMany({
      where: {
        userId: user.role === 'EMPLOYEE' ? user.sub : userId,
        ...this.getUserCinemaFilter(user),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    user: any,
    data: {
      userId: number;
      title: string;
      fileUrl: string;
      fileName: string;
      fileType?: string;
    },
  ) {
    if (user.role === 'EMPLOYEE' && data.userId !== user.sub) {
      throw new ForbiddenException(
        'Du kan kun uploade dokumenter til dig selv',
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        id: data.userId,
        ...this.getCinemaFilter(user),
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

  async delete(user: any, id: number) {
    const document = await this.prisma.employeeDocument.findFirst({
      where: {
        id,
        ...this.getUserCinemaFilter(user),
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
