import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './helpers/employee-document-access';
import {
  findEmployeeDocumentsPage,
  type EmployeeDocumentListOptions,
} from './helpers/employee-document-list-query';

type EmployeeDocumentListItem = {
  id: number;
  fileUrl: string;
};

@Injectable()
export class EmployeeDocumentListService {
  constructor(private readonly prisma: PrismaService) {}

  private withProtectedFileUrl<T extends EmployeeDocumentListItem>(
    document: T,
  ) {
    return {
      ...document,
      fileUrl: `/employee-documents/${document.id}/download`,
    };
  }

  async findForUser(
    user: AuthUser,
    userId: number,
    options: EmployeeDocumentListOptions,
  ) {
    const result = await findEmployeeDocumentsPage(
      this.prisma,
      user,
      userId,
      options,
    );

    return {
      ...result,
      items: result.items.map((document) =>
        this.withProtectedFileUrl(document),
      ),
    };
  }
}
