import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './helpers/employee-document-access';
import {
  createEmployeeDocument,
  type CreateEmployeeDocumentData,
} from './helpers/employee-document-create-flow';
import { deleteEmployeeDocument } from './helpers/employee-document-delete-flow';
import { findEmployeeDocumentsForUser } from './helpers/employee-document-read-flow';

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  async findForUser(
    user: AuthUser,
    userId: number,
    selectedCinemaId?: number | null,
  ) {
    return findEmployeeDocumentsForUser(
      this.prisma,
      user,
      userId,
      selectedCinemaId,
    );
  }

  async create(user: AuthUser, data: CreateEmployeeDocumentData) {
    return createEmployeeDocument(this.prisma, user, data);
  }

  async delete(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    return deleteEmployeeDocument(this.prisma, user, id, selectedCinemaId);
  }
}
