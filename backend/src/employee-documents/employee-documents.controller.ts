import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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

@Controller('employee-documents')
export class EmployeeDocumentsController {
  constructor(
    private employeeDocumentsService: EmployeeDocumentsService,
  ) {}

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Get('user/:userId')
  findForUser(@Param('userId') userId: string) {
    return this.employeeDocumentsService.findForUser(Number(userId));
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/employee-documents',
        filename: (_, file, callback) => {
          const uniqueName =
            Date.now() + '-' + Math.round(Math.random() * 1e9);

          callback(
            null,
            `${uniqueName}${extname(file.originalname)}`,
          );
        },
      }),
    }),
  )
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { userId: string; title: string },
  ) {
    return this.employeeDocumentsService.create({
      userId: Number(body.userId),
      title: body.title,
      fileUrl: `http://localhost:3001/uploads/employee-documents/${file.filename}`,
      fileName: file.originalname,
      fileType: file.mimetype,
    });
  }

  @UseGuards(JwtGuard, new RolesGuard(['ADMIN', 'MASTER']))
  @Delete(':id')
  deleteDocument(@Param('id') id: string) {
    return this.employeeDocumentsService.delete(Number(id));
  }
}