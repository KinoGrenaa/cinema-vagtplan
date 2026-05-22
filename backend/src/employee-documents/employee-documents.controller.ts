import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { EmployeeDocumentsService } from './employee-documents.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';

@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(private employeeDocumentsService: EmployeeDocumentsService) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Get('user/:userId')
  findForUser(@Req() req: any, @Param('userId') userId: string) {
    return this.employeeDocumentsService.findForUser(req.user, Number(userId));
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
  uploadDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; title: string },
  ) {
    if (!file) {
      throw new BadRequestException('Ingen fil uploadet');
    }

    return this.employeeDocumentsService.create(req.user, {
      userId: Number(body.userId),
      title: body.title,
      fileUrl: `${process.env.NEXT_PUBLIC_API_URL}/uploads/employee-documents/${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype,
    });
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER', 'EMPLOYEE')
  @Delete(':id')
  deleteDocument(@Req() req: any, @Param('id') id: string) {
    return this.employeeDocumentsService.delete(req.user, Number(id));
  }
}
