import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream } from 'fs';
import { open, unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { EmployeeDocumentsService } from './employee-documents.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

const employeeDocumentExtensionsByMime: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const employeeDocumentStoredExtensionByMime: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const invalidEmployeeDocumentMessage =
  'Kun PDF, DOCX, XLSX, JPG, PNG og WEBP er tilladt';

@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(private employeeDocumentsService: EmployeeDocumentsService) {}

  private parseCinemaId(value?: string | number | null) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const cinemaId = Number(value);
    if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
      throw new BadRequestException('Biograf skal være et gyldigt ID');
    }

    return cinemaId;
  }

  private parseRequiredId(value: string | number, message: string) {
    const parsedId = Number(value);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new BadRequestException(message);
    }

    return parsedId;
  }

  private async hasExpectedFileSignature(file: Express.Multer.File) {
    const handle = await open(file.path, 'r');

    try {
      const signature = Buffer.alloc(12);
      const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
      const bytes = signature.subarray(0, bytesRead);

      switch (file.mimetype) {
        case 'application/pdf':
          return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          const isZip =
            bytes.length >= 4 &&
            bytes[0] === 0x50 &&
            bytes[1] === 0x4b &&
            ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
              (bytes[2] === 0x05 && bytes[3] === 0x06) ||
              (bytes[2] === 0x07 && bytes[3] === 0x08));

          if (!isZip) {
            return false;
          }

          const contents = await handle.readFile();
          const requiredFolder =
            file.mimetype ===
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              ? 'word/'
              : 'xl/';

          return (
            contents.includes(Buffer.from('[Content_Types].xml')) &&
            contents.includes(Buffer.from(requiredFolder))
          );
        }
        case 'image/jpeg':
          return (
            bytes.length >= 3 &&
            bytes[0] === 0xff &&
            bytes[1] === 0xd8 &&
            bytes[2] === 0xff
          );
        case 'image/png':
          return (
            bytes.length >= 8 &&
            bytes.subarray(0, 8).equals(
              Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            )
          );
        case 'image/webp':
          return (
            bytes.length >= 12 &&
            bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
            bytes.subarray(8, 12).toString('ascii') === 'WEBP'
          );
        default:
          return false;
      }
    } finally {
      await handle.close();
    }
  }

  private async removeRejectedUpload(file: Express.Multer.File) {
    try {
      await unlink(file.path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        // Keep the original validation/database error as the response.
      }
    }
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Get('user/:userId')
  findForUser(
    @Req() req: any,
    @Param('userId') userId: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.employeeDocumentsService.findForUser(
      req.user,
      this.parseRequiredId(userId, 'Bruger skal være et gyldigt ID'),
      this.parseCinemaId(cinemaId),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/employee-documents',
        filename: (_, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = employeeDocumentStoredExtensionByMime[file.mimetype];

          if (!extension) {
            return callback(
              new BadRequestException(invalidEmployeeDocumentMessage),
              '',
            );
          }

          callback(null, `${uniqueName}${extension}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const extension = extname(file.originalname).toLowerCase();
        const allowedExtensions =
          employeeDocumentExtensionsByMime[file.mimetype];

        if (!allowedExtensions?.includes(extension)) {
          return callback(
            new BadRequestException(invalidEmployeeDocumentMessage),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; title: string; cinemaId?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Ingen fil uploadet');
    }

    try {
      if (!(await this.hasExpectedFileSignature(file))) {
        throw new BadRequestException(invalidEmployeeDocumentMessage);
      }

      return await this.employeeDocumentsService.create(req.user, {
        userId: this.parseRequiredId(
          body.userId,
          'Bruger skal være et gyldigt ID',
        ),
        title: body.title,
        cinemaId: this.parseCinemaId(body.cinemaId),
        fileUrl: `/uploads/employee-documents/${file.filename}`,
        fileName: file.originalname,
        fileType: file.mimetype,
      });
    } catch (error) {
      await this.removeRejectedUpload(file);
      throw error;
    }
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Get(':id/download')
  async downloadDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.employeeDocumentsService.getDownload(
      req.user,
      this.parseRequiredId(id, 'Dokument skal være et gyldigt ID'),
      this.parseCinemaId(cinemaId),
    );

    const safeFileName = document.fileName.replace(/[\r\n"]/g, '_');
    response.set({
      'Content-Type': document.fileType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(
        document.fileName,
      )}`,
    });

    return new StreamableFile(createReadStream(document.filePath));
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Delete(':id')
  deleteDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.employeeDocumentsService.delete(
      req.user,
      this.parseRequiredId(id, 'Dokument skal være et gyldigt ID'),
      this.parseCinemaId(cinemaId),
    );
  }
}
