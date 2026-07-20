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
import { unlink } from 'fs/promises';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { EmployeeDocumentsService } from './employee-documents.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

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
          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_, file, callback) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        const blockedExtensions = [
          '.exe',
          '.js',
          '.html',
          '.htm',
          '.svg',
          '.docm',
          '.xlsm',
          '.bat',
          '.cmd',
          '.ps1',
        ];
        const extension = extname(file.originalname).toLowerCase();

        if (
          !allowedTypes.includes(file.mimetype) ||
          blockedExtensions.includes(extension)
        ) {
          return callback(
            new BadRequestException(
              'Kun PDF, DOCX, XLSX, JPG, PNG og WEBP er tilladt',
            ),
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
