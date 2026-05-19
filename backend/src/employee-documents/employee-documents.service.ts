import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  findForUser(userId: number) {
    return this.prisma.employeeDocument.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  create(data: {
    userId: number;
    title: string;
    fileUrl: string;
    fileName: string;
    fileType?: string;
  }) {
    return this.prisma.employeeDocument.create({
      data,
    });
  }

  delete(id: number) {
    return this.prisma.employeeDocument.delete({
      where: { id },
    });
  }
}
