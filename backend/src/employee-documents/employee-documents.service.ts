import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync } from 'fs';
import { basename, resolve, sep } from 'path';

import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from './helpers/employee-document-access';
import {
  createEmployeeDocument,
  type CreateEmployeeDocumentData,
} from './helpers/employee-document-create-flow';
import { deleteEmployeeDocument } from './helpers/employee-document-delete-flow';
import { findEmployeeDocumentsForUser } from './helpers/employee-document-read-flow';

type EmployeeDocumentWithProtectedUrl = {
  id: number;
  fileUrl: string;
};

export type EmployeeDocumentDownload = {
  filePath: string;
  fileName: string;
  fileType: string;
};

@Injectable()
export class EmployeeDocumentsService {
  constructor(private prisma: PrismaService) {}

  private withProtectedFileUrl<T extends EmployeeDocumentWithProtectedUrl>(
    document: T,
  ) {
    return {
      ...document,
      fileUrl: `/employee-documents/${document.id}/download`,
    };
  }

  private getStoredEmployeeDocumentFilePath(fileUrl: string) {
    const fileName = basename(fileUrl);
    const uploadDir = resolve(process.cwd(), 'uploads', 'employee-documents');
    const filePath = resolve(uploadDir, fileName);

    if (!fileName || fileName === '.' || filePath === uploadDir) {
      throw new NotFoundException('Dokumentfilen blev ikke fundet');
    }

    if (!filePath.startsWith(`${uploadDir}${sep}`)) {
      throw new ForbiddenException('Ugyldig dokumentsti');
    }

    return filePath;
  }

  async findForUser(
    user: AuthUser,
    userId: number,
    selectedCinemaId?: number | null,
  ) {
    const documents = await findEmployeeDocumentsForUser(
      this.prisma,
      user,
      userId,
      selectedCinemaId,
    );

    return documents.map((document) => this.withProtectedFileUrl(document));
  }

  async create(user: AuthUser, data: CreateEmployeeDocumentData) {
    const document = await createEmployeeDocument(this.prisma, user, data);

    return this.withProtectedFileUrl(document);
  }

  async getDownload(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ): Promise<EmployeeDocumentDownload> {
    const document = await this.prisma.employeeDocument.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Dokumentet blev ikke fundet');
    }

    const allowedDocuments = await findEmployeeDocumentsForUser(
      this.prisma,
      user,
      document.userId,
      selectedCinemaId,
    );

    if (!allowedDocuments.some((allowedDocument) => allowedDocument.id === id)) {
      throw new ForbiddenException('Du har ikke adgang til dokumentet');
    }

    const filePath = this.getStoredEmployeeDocumentFilePath(document.fileUrl);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Dokumentfilen blev ikke fundet');
    }

    return {
      filePath,
      fileName: document.fileName,
      fileType: document.fileType,
    };
  }

  async delete(
    user: AuthUser,
    id: number,
    selectedCinemaId?: number | null,
  ) {
    return deleteEmployeeDocument(this.prisma, user, id, selectedCinemaId);
  }
}
